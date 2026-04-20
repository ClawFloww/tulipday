"use client";

// Badge die de recentste bloei-status van een specifiek bollenveld toont

import { useMemo } from "react";
import { Users } from "lucide-react";
import type { FieldBloomStatus } from "@/lib/tulipFields";
import {
  STATUS_CONFIG,
  calculateReliabilityScore,
  getReliabilityLabel,
  timeAgo,
} from "@/lib/tulipFields";

interface Props {
  fieldId: string;
  statuses: FieldBloomStatus[];
  /** Toont uitgebreide versie met betrouwbaarheidslabel */
  extended?: boolean;
}

export default function BloomStatusBadge({ fieldId, statuses, extended = false }: Props) {
  const latest = useMemo(() => {
    const forField = statuses
      .filter((s) => s.fieldId === fieldId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return forField[0] ?? null;
  }, [fieldId, statuses]);

  if (!latest) return null;

  // Herbereken score op render-moment voor versheid
  const score = calculateReliabilityScore(latest);
  if (score === 0) return null; // ouder dan 24 uur → niet tonen

  const cfg = STATUS_CONFIG[latest.status];
  const reliabilityLabel = getReliabilityLabel(score);

  // Kleur van betrouwbaarheidslabel
  const reliabilityColor =
    score > 0.7 ? "#2D7D46" : score > 0.3 ? "#92400E" : "#6B7280";

  return (
    <div
      className="rounded-2xl px-3 py-2.5 inline-flex flex-col gap-1.5"
      style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.border}` }}
      role="status"
      aria-label={`Bloei-status: ${cfg.label}`}
    >
      {/* Status regel */}
      <div className="flex items-center gap-2">
        <span className="text-base" role="img" aria-hidden="true">{cfg.emoji}</span>
        <span className="font-bold text-sm" style={{ color: cfg.text }}>
          {cfg.label}
        </span>
        <span className="text-xs" style={{ color: cfg.text, opacity: 0.6 }}>
          · {timeAgo(latest.timestamp)}
        </span>
        {latest.confirmedBy > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs"
            style={{ color: cfg.text, opacity: 0.6 }}
          >
            · <Users size={11} className="inline" /> {latest.confirmedBy}
          </span>
        )}
      </div>

      {/* Betrouwbaarheid + suffix */}
      {extended && (
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: reliabilityColor,
              backgroundColor: reliabilityColor + "18",
            }}
          >
            {reliabilityLabel}
          </span>
          <span className="text-[10px] text-gray-400">
            Laatste update door bezoekers
          </span>
        </div>
      )}
    </div>
  );
}
