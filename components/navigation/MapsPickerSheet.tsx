"use client";

// Terugvaloptie: navigeer naar de huidige stop in Google Maps of Apple Maps
// (bijv. zonder GPS-toestemming in de app). Universele HTTPS-links openen de
// native app als die er is, anders de browser. Geen Komoot (geen licentie).

import { ChevronRight, Map as MapIcon } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { BottomSheet } from "@/components/ui/BottomSheet";

import type { NavStop } from "./NavigationView";

type Mode = "bike" | "car" | "walk";

interface Props {
  stop:    NavStop;
  mode:    Mode;
  onClose: () => void;
}

function googleMapsUrl(stop: NavStop, mode: Mode): string {
  const travel = mode === "bike" ? "bicycling" : mode === "walk" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=${travel}`;
}

function appleMapsUrl(stop: NavStop, mode: Mode): string {
  // Apple Maps heeft geen fietsmodus; lopen komt het dichtst in de buurt
  const dirflg = mode === "car" ? "d" : "w";
  return `https://maps.apple.com/?daddr=${stop.lat},${stop.lng}&dirflg=${dirflg}`;
}

function openUrl(url: string) {
  // _system opent in Capacitor de externe app i.p.v. de WebView
  const win = window.open(url, "_system");
  if (!win) window.location.href = url;
}

export default function MapsPickerSheet({ stop, mode, onClose }: Props) {
  const { t } = useT();

  const apps = [
    { key: "google", name: t("navigation.maps_google"), sub: t("navigation.maps_google_sub"), url: googleMapsUrl(stop, mode) },
    { key: "apple",  name: t("navigation.maps_apple"),  sub: t("navigation.maps_apple_sub"),  url: appleMapsUrl(stop, mode) },
  ];

  return (
    <BottomSheet open onClose={onClose} showClose title={t("navigation.maps_picker_title", { name: stop.name })}>
      <p className="mb-3 text-caption text-ink-3">{t("navigation.maps_picker_subtitle")}</p>
      <div className="flex flex-col gap-2">
        {apps.map((app) => (
          <button
            key={app.key}
            type="button"
            onClick={() => { openUrl(app.url); onClose(); }}
            className="flex min-h-touch w-full items-center gap-3 rounded-2xl bg-surface-3 px-4 py-3 text-left active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
              <MapIcon size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-label text-ink">{app.name}</span>
              <span className="block text-caption text-ink-3">{app.sub}</span>
            </span>
            <ChevronRight size={16} className="text-ink-3" aria-hidden />
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
