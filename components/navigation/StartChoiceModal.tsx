"use client";

// Eerste keuze-scherm bij het openen van /navigate. Vraagt de gebruiker of
// hij vanaf zijn huidige locatie wil starten (GPS) of een ander punt op de
// kaart wil aanwijzen. Volledige overlay zodat de keuze bewust gemaakt wordt
// voordat de route wordt opgebouwd.

import { motion } from "framer-motion";
import { Locate, MapPin, X } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface Props {
  routeName: string;
  onUseCurrentLocation: () => void;
  onPickOnMap:          () => void;
  onCancel:             () => void;
}

export default function StartChoiceModal({
  routeName, onUseCurrentLocation, onPickOnMap, onCancel,
}: Props) {
  const { t } = useT();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-3 bg-black/60 backdrop-blur-sm"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
    >
      <motion.div
        initial={{ y: "30%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-md rounded-3xl p-5 shadow-2xl"
        style={{ backgroundColor: "var(--color-surface-2)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
              {t("navigation.start_choice_eyebrow")}
            </p>
            <p className="text-xl font-extrabold leading-tight truncate" style={{ color: "var(--color-text)" }}>
              {routeName}
            </p>
            <p className="text-sm mt-1.5" style={{ color: "var(--color-text-2)" }}>
              {t("navigation.start_choice_prompt")}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}
            aria-label={t("common.cancel")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Twee keuzes */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="flex items-center gap-3 w-full bg-tulip-500 text-white px-4 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 6px 18px rgba(232,16,42,0.32)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Locate size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-extrabold">{t("navigation.start_use_current")}</p>
              <p className="text-xs opacity-80 mt-0.5">{t("navigation.start_use_current_hint")}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onPickOnMap}
            className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
            style={{
              backgroundColor: "var(--color-surface-3)",
              color: "var(--color-text)",
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-tulip-500"
                 style={{ backgroundColor: "var(--color-surface-2)" }}>
              <MapPin size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-extrabold">{t("navigation.start_pick_on_map")}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
                {t("navigation.start_pick_on_map_hint")}
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
