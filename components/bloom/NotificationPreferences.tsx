"use client";

// Notificatie-instellingen voor bloei-updates, fotoverzoeken en reviews

import { motion } from "framer-motion";
import { Flower2, Camera, Star, Info } from "lucide-react";
import type { UserContributionPrefs } from "@/lib/tulipFields";

type PrefsToggleKeys = "statusUpdates" | "photoRequests" | "reviews";

interface Props {
  prefs: Pick<UserContributionPrefs, PrefsToggleKeys>;
  onChange: (patch: Pick<UserContributionPrefs, PrefsToggleKeys>) => void;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

// Herbruikbare toggle-rij
function ToggleRow({ icon, title, description, enabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: enabled ? "#FEF0F3" : "#F5F5F5" }}
        aria-hidden="true"
      >
        <span style={{ color: enabled ? "#E8527A" : "#9CA3AF" }}>
          {icon}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>

      {/* Toggle switch */}
      <motion.button
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={onToggle}
        className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors"
        style={{
          backgroundColor: enabled ? "#E8527A" : "#E5E7EB",
          minWidth: 48,
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 3px",
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className="block w-5 h-5 rounded-full bg-white shadow-sm"
          layout
          animate={{ x: enabled ? 24 : 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 400 }}
          aria-hidden="true"
        />
      </motion.button>
    </div>
  );
}

export default function NotificationPreferences({ prefs, onChange }: Props) {
  function toggle(key: PrefsToggleKeys) {
    onChange({ ...prefs, [key]: !prefs[key] });
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-base font-extrabold text-gray-900">Meldingen</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Ontvang alleen meldingen bij locaties op je route
        </p>
      </div>

      <div className="px-4 divide-y divide-gray-50">
        <ToggleRow
          icon={<Flower2 size={18} />}
          title="Status-updates"
          description="Melding als bezoekers de bloei bijwerken bij velden in je route"
          enabled={prefs.statusUpdates}
          onToggle={() => toggle("statusUpdates")}
        />
        <ToggleRow
          icon={<Camera size={18} />}
          title="Fotoverzoeken"
          description="Gevraagd een foto te maken bij velden zonder recente foto"
          enabled={prefs.photoRequests}
          onToggle={() => toggle("photoRequests")}
        />
        <ToggleRow
          icon={<Star size={18} />}
          title="Reviews"
          description="Herinnerd aan een beoordeling na je bezoek"
          enabled={prefs.reviews}
          onToggle={() => toggle("reviews")}
        />
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 mx-4 mb-4 mt-3 px-3 py-3 rounded-xl"
           style={{ backgroundColor: "#FFF9E6" }}>
        <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-snug">
          Pushmelding: &ldquo;Zie jij dit bollenveld nu? Help anderen met een snelle update.&rdquo;
        </p>
      </div>
    </div>
  );
}
