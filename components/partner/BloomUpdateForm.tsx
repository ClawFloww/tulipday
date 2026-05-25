"use client";

// Bottom-sheet formulier voor bollenveld-partners. Vijf grote tap-knoppen
// met een bloeifase + optionele opmerking. Schrijft naar bloom_updates met
// source = 'partner' zodat de hoofd-app onderscheid kan maken met user-
// submitted bloom-updates.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { insertBloomUpdate } from "@/lib/partner/queries";
import type { BloomPhase } from "@/lib/partner/types";

interface Props {
  partnerLocationId: string;
  locationId:        string;
  userId:            string;
  onDone:            () => void;
}

const PHASE_OPTIONS: { value: BloomPhase; emoji: string; label: string }[] = [
  { value: "not_yet",    emoji: "🌱",      label: "Nog niet in bloei" },
  { value: "first_buds", emoji: "🌿",      label: "Eerste knoppen"    },
  { value: "starting",   emoji: "🌷",      label: "Beginnende bloei"  },
  { value: "peak",       emoji: "🌷🌷🌷", label: "Volle bloei"        },
  { value: "fading",     emoji: "🥀",      label: "Uitgebloeid"       },
];

export function BloomUpdateForm({
  partnerLocationId, locationId, userId, onDone,
}: Props) {
  const [phase,      setPhase]      = useState<BloomPhase | null>(null);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phase) return;
    setSubmitting(true);
    setError(null);
    try {
      await insertBloomUpdate({
        partnerLocationId,
        locationId,
        phase,
        notes:     notes.trim() || null,
        createdBy: userId,
      });
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Kon bloeistatus niet opslaan: ${msg}`);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-[11px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--color-text-3)" }}>
          Bloeifase
        </p>
        <div className="grid grid-cols-1 gap-2">
          {PHASE_OPTIONS.map((opt) => {
            const active = phase === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPhase(opt.value)}
                className="rounded-xl py-3 px-4 text-sm font-bold text-left transition-transform active:scale-[0.99] flex items-center gap-3"
                style={{
                  backgroundColor: active ? "rgba(232,16,42,0.12)" : "var(--color-surface-3)",
                  color:           active ? "#E8102A" : "var(--color-text)",
                  border:          active ? "1.5px solid #E8102A" : "1.5px solid transparent",
                }}
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--color-text-3)" }}>
          Korte opmerking (optioneel)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 100))}
          rows={2}
          placeholder="Bv. 'Mooie rode tulpen, drukker dan vorige week'"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={{
            backgroundColor: "var(--color-surface-3)",
            color:           "var(--color-text)",
            border:          "1px solid var(--color-border)",
          }}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "var(--color-text-3)" }}>
          {notes.length}/100
        </p>
      </div>

      {error && (
        <p className="text-xs font-semibold p-3 rounded-lg"
           style={{ backgroundColor: "rgba(232,16,42,0.08)", color: "#E8102A" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!phase || submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          backgroundColor: "#E8102A",
          boxShadow: "0 4px 14px rgba(232,16,42,0.32)",
        }}
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        Bijwerken
      </button>
    </form>
  );
}
