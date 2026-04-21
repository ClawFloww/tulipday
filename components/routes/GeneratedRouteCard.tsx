"use client";

// Kaart voor een automatisch gegenereerde fietsroute

import { motion } from "framer-motion";
import { Clock, Flower2, Bike, ChevronRight, Zap } from "lucide-react";
import type { GeneratedRoute } from "@/lib/routeGenerator";
import type { FieldBloomStatus } from "@/lib/tulipFields";
import BloomStatusBadge from "@/components/bloom/BloomStatusBadge";
import RouteBloomScore from "./RouteBloomScore";

interface BloomData {
  bloomScore: number;
  fieldsInBloom: number;
}

interface Props {
  route: GeneratedRoute;
  statuses: FieldBloomStatus[];
  onClick: () => void;
  isSelected?: boolean;
  bloomData?: BloomData;
}

export default function GeneratedRouteCard({
  route,
  statuses,
  onClick,
  isSelected = false,
  bloomData,
}: Props) {
  // Tel hoeveel velden op de route in bloei zijn
  const bloomingOnRoute = route.fields.filter((f) =>
    statuses.some((s) => s.fieldId === f.id && s.status === "in_bloom"),
  ).length;

  const difficultyColor = route.difficulty === "makkelijk"
    ? { bg: "#E8F5E9", text: "#2D7D46" }
    : { bg: "#FFF3E0", text: "#E65100" };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl overflow-hidden transition-all
        ${isSelected
          ? "ring-2 ring-[#E8527A] shadow-lg"
          : "shadow-card hover:shadow-card-hover"
        }`}
      style={{ backgroundColor: "var(--color-surface-2)" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-start justify-between gap-2"
        style={{ borderBottom: "1.5px solid var(--color-border)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#FEF0F3", color: "#E8527A" }}
            >
              <Bike size={10} /> Fiets
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: difficultyColor.bg, color: difficultyColor.text }}
            >
              <Zap size={10} /> {route.difficulty}
            </span>
          </div>
          <h3 className="text-base font-extrabold leading-tight truncate" style={{ color: "var(--color-text)" }}>
            {route.name}
          </h3>
        </div>
        <ChevronRight
          size={18}
          className={`flex-shrink-0 mt-1 transition-transform ${isSelected ? "rotate-90 text-[#E8527A]" : ""}`}
        style={!isSelected ? { color: "var(--color-text-3)" } : {}}
        />
      </div>

      {/* Stats */}
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--color-text-2)" }}>
          <Bike size={15} style={{ color: "var(--color-text-3)" }} />
          {route.distanceKm} km
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--color-text-2)" }}>
          <Clock size={15} style={{ color: "var(--color-text-3)" }} />
          ±{route.estimatedMinutes} min
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--color-text-2)" }}>
          <Flower2 size={15} style={{ color: "var(--color-text-3)" }} />
          {route.fields.length} bollenvelden
        </div>
        {bloomingOnRoute > 0 && (
          <span
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-auto"
            style={{ backgroundColor: "#FEF0F3", color: "#E8527A" }}
          >
            🌷 {bloomingOnRoute} in bloei
          </span>
        )}
      </div>

      {/* Bloeikwaliteitsbalk */}
      {bloomData && (
        <div className="px-4 pb-2">
          <RouteBloomScore
            score={bloomData.bloomScore}
            fieldsInBloom={bloomData.fieldsInBloom}
            totalFields={route.fields.length}
          />
        </div>
      )}

      {/* Bloei-badges van de eerste 3 velden op de route */}
      {statuses.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {route.fields.slice(0, 3).map((f) => (
            <BloomStatusBadge key={f.id} fieldId={f.id} statuses={statuses} />
          ))}
        </div>
      )}

      {/* Start route knop */}
      <div className="px-4 pb-4">
        <div
          className="w-full py-2.5 rounded-xl text-white text-sm font-bold text-center"
          style={{ backgroundColor: "#E8527A" }}
        >
          Start bij {route.startLocation.label} →
        </div>
      </div>
    </motion.button>
  );
}
