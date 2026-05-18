"use client";

// Bottom sheet die de gebruiker laat kiezen tussen externe kaart-apps voor
// turn-by-turn navigatie naar de huidige stop. TulipDay houdt zelf de route/stops
// bij — de daadwerkelijke navigatie wordt uitbesteed aan Google Maps / Apple Maps
// / Komoot. Werkt via universele HTTPS links die op iOS/Android openen in de
// native app indien geïnstalleerd, anders in de browser.

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { useT } from "@/lib/i18n-context";

import type { NavStop } from "./NavigationView";

type Mode = "bike" | "car" | "walk";

interface MapsApp {
  key:   "google" | "apple" | "komoot";
  name:  string;
  sub:   string;
  icon:  string;
}

interface Props {
  stop:   NavStop;
  mode:   Mode;
  onClose: () => void;
}

function googleMapsUrl(stop: NavStop, mode: Mode): string {
  const travel = mode === "bike" ? "bicycling" : mode === "walk" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=${travel}`;
}

function appleMapsUrl(stop: NavStop, mode: Mode): string {
  // Apple Maps heeft geen fietsmodus; fall back op lopen
  const dirflg = mode === "car" ? "d" : mode === "walk" || mode === "bike" ? "w" : "d";
  return `https://maps.apple.com/?daddr=${stop.lat},${stop.lng}&dirflg=${dirflg}`;
}

function komootUrl(stop: NavStop): string {
  // Komoot heeft geen publieke route-planning-deep-link; we openen het
  // planner-scherm gecentreerd op de stop, zodat de gebruiker zelf een
  // route kan plannen.
  return `https://www.komoot.com/plan/@${stop.lat},${stop.lng},15z`;
}

function openUrl(url: string) {
  // _system target opent in Capacitor in de externe browser/app i.p.v. de WebView.
  // Als de browser de popup blokkeert valt window.open terug op null en
  // navigeren we direct naar de URL.
  const win = window.open(url, "_system");
  if (!win) window.location.href = url;
}

export default function MapsPickerSheet({ stop, mode, onClose }: Props) {
  const { t } = useT();

  const apps: MapsApp[] = [
    { key: "google", name: t("navigation.maps_google"), sub: t("navigation.maps_google_sub"), icon: "🗺️" },
    { key: "apple",  name: t("navigation.maps_apple"),  sub: t("navigation.maps_apple_sub"),  icon: "🍎" },
    { key: "komoot", name: t("navigation.maps_komoot"), sub: t("navigation.maps_komoot_sub"), icon: "🚴" },
  ];

  function handlePick(key: MapsApp["key"]) {
    const url =
      key === "google" ? googleMapsUrl(stop, mode) :
      key === "apple"  ? appleMapsUrl(stop, mode) :
                         komootUrl(stop);
    openUrl(url);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[calc(100%-24px)] max-w-md mx-3 rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: "var(--color-surface-2)" }}
        >
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3"
               style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold leading-tight"
                 style={{ color: "var(--color-text)" }}>
                {t("navigation.maps_picker_title", { name: stop.name })}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-3)" }}>
                {t("navigation.maps_picker_subtitle")}
              </p>
            </div>
            <button type="button" onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                    style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}>
              <X size={16} />
            </button>
          </div>

          {apps.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={() => handlePick(app.key)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:scale-[0.99] transition-transform"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                   style={{ backgroundColor: "var(--color-surface-3)" }}>
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{app.name}</p>
                <p className="text-xs" style={{ color: "var(--color-text-3)" }}>{app.sub}</p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--color-text-3)" }} />
            </button>
          ))}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 text-sm font-bold text-tulip-500 active:scale-[0.99] transition-transform"
          >
            {t("common.cancel")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
