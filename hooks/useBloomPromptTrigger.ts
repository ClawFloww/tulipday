// Hook die bepaalt wanneer de bloei-status prompt getoond moet worden

import { useState, useEffect, useCallback } from "react";
import {
  TulipField,
  UserContributionPrefs,
  DEFAULT_PREFS,
  TULIP_FIELDS,
  haversineDistance,
} from "@/lib/tulipFields";

const PREFS_KEY = "tulipday_bloom_prefs";
const TRIGGER_RADIUS_M = 150;    // maximale afstand in meters voor trigger
const COOLDOWN_SAME_FIELD_MS = 60 * 60 * 1000;   // 1 uur opnieuw prompen voor zelfde veld

// Laad prefs uit localStorage en herstel Date-objecten
function loadPrefs(): UserContributionPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      lastPromptedAt: parsed.lastPromptedAt ?? {},
      lastSubmittedAt: parsed.lastSubmittedAt ?? {},
      dismissedFields: parsed.dismissedFields ?? [],
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: UserContributionPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

interface BloomPromptState {
  nearbyField: TulipField | null;
  shouldPrompt: boolean;
  prefs: UserContributionPrefs;
  // Roep aan wanneer gebruiker "Niet nu" klikt
  dismissField: (fieldId: string) => void;
  // Roep aan wanneer gebruiker een status heeft ingediend
  markSubmitted: (fieldId: string) => void;
  // Roep aan om prefs te updaten (notificatie-instellingen)
  updatePrefs: (patch: Partial<UserContributionPrefs>) => void;
}

export function useBloomPromptTrigger(
  userLat: number | null,
  userLng: number | null,
): BloomPromptState {
  const [prefs, setPrefs] = useState<UserContributionPrefs>(DEFAULT_PREFS);

  // Laad prefs uit localStorage na mount (client-only)
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  // Bereken het dichtstbijzijnde veld
  const nearbyField: TulipField | null =
    userLat == null || userLng == null
      ? null
      : TULIP_FIELDS.reduce<{ field: TulipField | null; dist: number }>(
          (best, field) => {
            const d = haversineDistance(userLat, userLng, field.lat, field.lng);
            return d < best.dist ? { field, dist: d } : best;
          },
          { field: null, dist: Infinity },
        ).field &&
        (() => {
          const closest = TULIP_FIELDS.reduce<{ field: TulipField; dist: number } | null>(
            (best, field) => {
              const d = haversineDistance(userLat, userLng, field.lat, field.lng);
              if (!best || d < best.dist) return { field, dist: d };
              return best;
            },
            null,
          );
          if (!closest) return null;
          return closest.dist <= TRIGGER_RADIUS_M ? closest.field : null;
        })();

  // Bepaal of prompt getoond moet worden
  const shouldPrompt = (() => {
    if (!nearbyField) return false;
    const id = nearbyField.id;

    // Gebruiker klikte "Niet nu" voor dit veld in deze sessie
    if (prefs.dismissedFields.includes(id)) return false;

    // Recent al een update ingediend (< 24 uur geleden)
    const lastSubmit = prefs.lastSubmittedAt[id];
    if (lastSubmit && Date.now() - lastSubmit < 24 * 60 * 60 * 1000) return false;

    // Al geprompt in het laatste uur
    const lastPrompt = prefs.lastPromptedAt[id];
    if (lastPrompt && Date.now() - lastPrompt < COOLDOWN_SAME_FIELD_MS) return false;

    return true;
  })();

  // Sla prompt-tijdstip op zodra het veld zichtbaar wordt
  useEffect(() => {
    if (shouldPrompt && nearbyField) {
      setPrefs((prev) => {
        const next = {
          ...prev,
          lastPromptedAt: { ...prev.lastPromptedAt, [nearbyField.id]: Date.now() },
        };
        savePrefs(next);
        return next;
      });
    }
  }, [shouldPrompt, nearbyField?.id]);

  // Veld wegdismissen voor de rest van de sessie
  const dismissField = useCallback((fieldId: string) => {
    setPrefs((prev) => {
      const next: UserContributionPrefs = {
        ...prev,
        dismissedFields: prev.dismissedFields.includes(fieldId)
          ? prev.dismissedFields
          : [...prev.dismissedFields, fieldId],
      };
      savePrefs(next);
      return next;
    });
  }, []);

  // Update na succesvolle indiening
  const markSubmitted = useCallback((fieldId: string) => {
    setPrefs((prev) => {
      const next: UserContributionPrefs = {
        ...prev,
        lastSubmittedAt: { ...prev.lastSubmittedAt, [fieldId]: Date.now() },
        // Verwijder ook uit dismissed zodat volgende dag opnieuw geprompt wordt
        dismissedFields: prev.dismissedFields.filter((id) => id !== fieldId),
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const updatePrefs = useCallback((patch: Partial<UserContributionPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  return { nearbyField, shouldPrompt, prefs, dismissField, markSubmitted, updatePrefs };
}
