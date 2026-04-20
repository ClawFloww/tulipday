"use client";

// Eenmalige locatietoestemmings-kaart — verschijnt boven WeatherCard op homepage

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

interface Props {
  onGrant:   () => void; // Gebruiker kiest "Locatie gebruiken"
  onDecline: () => void; // Gebruiker kiest "Nee, gebruik Lisse"
}

export default function LocationPermissionCard({ onGrant, onDecline }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="mx-4 mb-3 rounded-2xl bg-white shadow-card overflow-hidden"
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* Icoon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#FEF0F3" }}
        >
          <MapPin size={18} style={{ color: "#E8527A" }} />
        </div>

        {/* Tekst */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-gray-900 leading-tight mb-0.5">
            Fietsweer voor jouw locatie
          </p>
          <p className="text-xs text-gray-500 leading-snug mb-3">
            Krijg weerbericht voor jouw exacte locatie
          </p>

          {/* Knoppen */}
          <div className="flex gap-2">
            <button
              onClick={onGrant}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold
                         active:scale-95 transition-transform"
              style={{ backgroundColor: "#E8527A" }}
            >
              Locatie gebruiken
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600
                         text-xs font-bold active:scale-95 transition-transform"
            >
              Nee, gebruik Lisse
            </button>
          </div>
        </div>
      </div>

      {/* Privacy-tekst */}
      <p className="text-[10px] text-gray-400 text-center px-4 pb-3 leading-snug">
        Je locatie wordt alleen gebruikt voor het weerbericht en niet opgeslagen of gedeeld.
      </p>
    </motion.div>
  );
}
