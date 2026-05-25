"use client";

// Toont de huidige status van een partner_location in een opvallende kaart.
// Twee modi: operational (open/dicht + drukte) en bloom (5 fases). Bij
// ontbreken van een update toont een vriendelijke "nog geen update" state.

import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type {
  BloomPhase,
  CrowdLevel,
  CurrentBloomStatus,
  CurrentOperationalStatus,
  OperationalStatus,
} from "@/lib/partner/types";

const OP_LABEL: Record<OperationalStatus, { emoji: string; text: string; color: string }> = {
  open:          { emoji: "🟢", text: "Open",            color: "#2D7D46" },
  closing_soon:  { emoji: "🟡", text: "Sluit binnenkort", color: "#F59E0B" },
  closed:        { emoji: "🔴", text: "Gesloten",         color: "#E8102A" },
};

const CROWD_LABEL: Record<CrowdLevel, { emoji: string; text: string }> = {
  quiet:  { emoji: "😌", text: "Rustig" },
  normal: { emoji: "🙂", text: "Normaal" },
  busy:   { emoji: "😅", text: "Druk" },
  full:   { emoji: "🚫", text: "Vol" },
};

const BLOOM_LABEL: Record<BloomPhase, { emoji: string; text: string; color: string }> = {
  not_yet:    { emoji: "🌱",      text: "Nog niet in bloei", color: "#9E9E9E" },
  first_buds: { emoji: "🌿",      text: "Eerste knoppen",    color: "#84CC16" },
  starting:   { emoji: "🌷",      text: "Beginnende bloei",  color: "#F59E0B" },
  peak:       { emoji: "🌷🌷🌷", text: "Volle bloei",        color: "#2D7D46" },
  fading:     { emoji: "🥀",      text: "Uitgebloeid",       color: "#9E9E9E" },
};

interface Props {
  mode:     "operational" | "bloom";
  op?:      CurrentOperationalStatus | null;
  bloom?:   CurrentBloomStatus | null;
}

function relTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { locale: nl, addSuffix: true });
  } catch {
    return "";
  }
}

export function StatusBadge({ mode, op, bloom }: Props) {
  // ── Operational ─────────────────────────────────────────────────────────
  if (mode === "operational") {
    if (!op) {
      return (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-[10px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
            Huidige status
          </p>
          <p className="text-sm font-bold" style={{ color: "var(--color-text-2)" }}>
            Nog geen update
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-3)" }}>
            Werk je status bij zodat bezoekers weten of je open bent.
          </p>
        </div>
      );
    }

    const status = OP_LABEL[op.status];
    const crowd  = op.crowd_level ? CROWD_LABEL[op.crowd_level] : null;
    return (
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-[10px] font-extrabold tracking-wider uppercase text-tulip-500 mb-2">
          Huidige status
        </p>
        <p className="text-2xl font-extrabold leading-none" style={{ color: status.color }}>
          {status.emoji} {status.text}
          {crowd && (
            <span className="text-base font-bold" style={{ color: "var(--color-text-2)" }}>
              {" · "}{crowd.emoji} {crowd.text}
            </span>
          )}
        </p>
        {op.notes && (
          <p className="text-xs italic mt-2" style={{ color: "var(--color-text-2)" }}>
            “{op.notes}”
          </p>
        )}
        <p className="text-[11px] mt-3" style={{ color: "var(--color-text-3)" }}>
          Bijgewerkt {relTime(op.updated_at)}
        </p>
      </div>
    );
  }

  // ── Bloom ───────────────────────────────────────────────────────────────
  if (!bloom) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-[10px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
          Huidige bloeistatus
        </p>
        <p className="text-sm font-bold" style={{ color: "var(--color-text-2)" }}>
          Nog geen update
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-3)" }}>
          Bezoekers willen weten of het veld al in bloei staat.
        </p>
      </div>
    );
  }

  const phase = BLOOM_LABEL[bloom.phase];
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-[10px] font-extrabold tracking-wider uppercase text-tulip-500 mb-2">
        Huidige bloeistatus
      </p>
      <p className="text-2xl font-extrabold leading-none" style={{ color: phase.color }}>
        {phase.emoji} {phase.text}
      </p>
      {bloom.notes && (
        <p className="text-xs italic mt-2" style={{ color: "var(--color-text-2)" }}>
          “{bloom.notes}”
        </p>
      )}
      <p className="text-[11px] mt-3" style={{ color: "var(--color-text-3)" }}>
        Bijgewerkt {relTime(bloom.updated_at)}
      </p>
    </div>
  );
}
