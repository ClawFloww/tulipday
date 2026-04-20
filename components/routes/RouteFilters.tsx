"use client";

// Filteropties voor de auto-gegenereerde fietsroutes

import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import {
  RouteFiltersState,
  START_LOCATIONS,
  StartLocationKey,
  DistanceOption,
  FieldCountOption,
  SortOption,
} from "@/lib/routeGenerator";

interface Props {
  filters: RouteFiltersState;
  onChange: (patch: Partial<RouteFiltersState>) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

// Kleine pill-knop helper
function Pill({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-all
        ${active
          ? "bg-[#E8527A] border-[#E8527A] text-white shadow-sm"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#E8527A] hover:text-[#E8527A]"
        }`}
      style={{ minHeight: 36 }}
    >
      {children}
    </motion.button>
  );
}

export default function RouteFilters({ filters, onChange, onGenerate, isLoading }: Props) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 space-y-4">

      {/* Startpunt */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
          <Navigation size={11} /> Startpunt
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {(Object.keys(START_LOCATIONS) as StartLocationKey[]).map((key) => (
            <Pill
              key={key}
              active={filters.startKey === key}
              onClick={() => onChange({ startKey: key })}
            >
              {START_LOCATIONS[key].name}
            </Pill>
          ))}
          <Pill
            active={false}
            onClick={() => {
              // Mijn locatie: gebruik geolocation (demo: niet geïmplementeerd)
              alert("Locatiepermissie vereist (demo)");
            }}
          >
            <span className="flex items-center gap-1">
              <MapPin size={11} /> Mijn locatie
            </span>
          </Pill>
        </div>
      </div>

      {/* Afstand */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Max. afstand
        </p>
        <div className="flex gap-2">
          {([5, 10, 15, 20] as DistanceOption[]).map((km) => (
            <Pill
              key={km}
              active={filters.maxDistanceKm === km}
              onClick={() => onChange({ maxDistanceKm: km })}
            >
              {km} km
            </Pill>
          ))}
        </div>
      </div>

      {/* Aantal velden */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Aantal bollenvelden
        </p>
        <div className="flex gap-2">
          {(["weinig", "normaal", "veel"] as FieldCountOption[]).map((opt) => (
            <Pill
              key={opt}
              active={filters.fieldCount === opt}
              onClick={() => onChange({ fieldCount: opt })}
            >
              {opt === "weinig" ? "Weinig (3–5)"
               : opt === "normaal" ? "Normaal (6–10)"
               : "Veel (11–15)"}
            </Pill>
          ))}
        </div>
      </div>

      {/* Sortering */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Sorteren op
        </p>
        <div className="flex gap-2">
          {(["dichtstbij", "meeste_bloei", "kortste"] as SortOption[]).map((opt) => (
            <Pill
              key={opt}
              active={filters.sort === opt}
              onClick={() => onChange({ sort: opt })}
            >
              {opt === "dichtstbij" ? "Dichtstbij"
               : opt === "meeste_bloei" ? "Meeste bloei"
               : "Kortste route"}
            </Pill>
          ))}
        </div>
      </div>

      {/* Genereer-knop */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full py-3.5 rounded-2xl text-white text-sm font-extrabold
                   transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: "#E8527A", minHeight: 52 }}
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            Route ophalen...
          </>
        ) : (
          "🚴 Genereer route"
        )}
      </motion.button>
    </div>
  );
}
