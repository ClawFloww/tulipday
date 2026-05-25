"use client";

// Compacte status-badge op LocationCard. Toont een emoji + korte tekst voor
// recente partner-updates (bloom of operational). Klik opent een tooltip
// met details (bijgewerkt-tijd en partner-naam) — voor MVP volstaat een
// title-attribuut zodat het zonder extra state-management werkt.

import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { LocationPartnerStatus } from "@/hooks/useLocationStatuses";

const OP_BADGE: Record<string, { emoji: string; label: string; bg: string; fg: string }> = {
  open:         { emoji: "🟢", label: "Open",         bg: "rgba(45,125,70,0.18)",  fg: "#2D7D46" },
  closing_soon: { emoji: "🟡", label: "Sluit binnenkort", bg: "rgba(245,158,11,0.18)", fg: "#B07306" },
  closed:       { emoji: "🔴", label: "Gesloten",     bg: "rgba(232,16,42,0.18)",  fg: "#E8102A" },
};

const CROWD_HINT: Record<string, string> = {
  quiet:  "Rustig",
  normal: "Normaal",
  busy:   "Druk",
  full:   "Vol",
};

const BLOOM_BADGE: Record<string, { emoji: string; label: string; bg: string; fg: string }> = {
  not_yet:    { emoji: "🌱", label: "Nog niet",     bg: "rgba(158,158,158,0.18)", fg: "#6B7280" },
  first_buds: { emoji: "🌿", label: "Eerste knoppen", bg: "rgba(132,204,22,0.18)", fg: "#65a30d" },
  starting:   { emoji: "🌷", label: "Beginnend",    bg: "rgba(245,158,11,0.18)",  fg: "#B07306" },
  peak:       { emoji: "🌷", label: "Volle bloei",  bg: "rgba(45,125,70,0.18)",   fg: "#2D7D46" },
  fading:     { emoji: "🥀", label: "Uitgebloeid",  bg: "rgba(158,158,158,0.18)", fg: "#6B7280" },
};

interface Props {
  status: LocationPartnerStatus;
}

export function LocationStatusBadge({ status }: Props) {
  const cfg = status.kind === "operational"
    ? OP_BADGE[status.status]
    : BLOOM_BADGE[status.status];

  if (!cfg) return null;

  const label = status.kind === "operational" && status.crowd
    ? `${cfg.label} · ${CROWD_HINT[status.crowd] ?? ""}`
    : cfg.label;

  let tooltip = `Bijgewerkt ${formatDistanceToNow(new Date(status.updated_at), { locale: nl, addSuffix: true })} door ${status.partner_name}`;
  if (status.notes) tooltip += ` — "${status.notes}"`;

  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <span>{cfg.emoji}</span>
      <span className="truncate max-w-[120px]">{label}</span>
    </span>
  );
}
