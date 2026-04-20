"use client";

// Eenmalige locatietoestemmings-kaart — verschijnt boven WeatherCard op homepage
// Gebruikt CSS variabelen voor donker thema ondersteuning

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

interface Props {
  onGrant:   () => void;
  onDecline: () => void;
}

export default function LocationPermissionCard({ onGrant, onDecline }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="mx-4 mb-3 rounded-2xl bg-surface-2 shadow-card overflow-hidden"
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* Icoon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-primary-subtle)" }}
        >
          <MapPin size={18} style={{ color: "var(--color-primary)" }} />
        </div>

        {/* Tekst */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold leading-tight mb-0.5"
             style={{ color: "var(--color-text)" }}>
            Fietsweer voor jouw locatie
          </p>
          <p className="text-xs leading-snug mb-3"
             style={{ color: "var(--color-text-2)" }}>
            Krijg weerbericht voor jouw exacte locatie
          </p>

          {/* Knoppen */}
          <div className="flex gap-2">
            <button
              onClick={onGrant}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold tap-scale"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Locatie gebruiken
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold tap-scale"
              style={{
                backgroundColor: "var(--color-surface-3)",
                color:           "var(--color-text-2)",
              }}
            >
              Nee, gebruik Lisse
            </button>
          </div>
        </div>
      </div>

      {/* Privacy-tekst */}
      <p className="text-[10px] text-center px-4 pb-3 leading-snug"
         style={{ color: "var(--color-text-3)" }}>
        Je locatie wordt alleen gebruikt voor het weerbericht en niet opgeslagen of gedeeld.
      </p>
    </motion.div>
  );
}
