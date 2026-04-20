"use client";

// Banner die verschijnt als bloeidata ouder is dan 2 uur

import { RefreshCw } from "lucide-react";

interface Props {
  staleness:  number;       // 0–1
  isSyncing:  boolean;
  lastSync:   Date | null;
  onRefresh:  () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function RouteRefreshBanner({
  staleness,
  isSyncing,
  lastSync,
  onRefresh,
}: Props) {
  const isStale = staleness >= 0.5;

  // Toon pas als data verouderd is óf als er gesynchroniseerd wordt
  if (!isStale && !isSyncing) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 text-xs"
      style={{
        backgroundColor: isStale ? "#FFF8E1" : "#F1F8F3",
        borderBottom: `1px solid ${isStale ? "#FFE082" : "#C8E6C9"}`,
      }}
    >
      <span style={{ color: isStale ? "#E65100" : "#2D7D46" }}>
        {isSyncing
          ? "Bloeidata ophalen..."
          : isStale
          ? "Bloeidata ouder dan 4 uur"
          : lastSync
          ? `Laatste sync: ${formatTime(lastSync)}`
          : "Bloeidata ophalen..."}
      </span>
      <button
        onClick={onRefresh}
        disabled={isSyncing}
        className="flex items-center gap-1 font-bold disabled:opacity-50"
        style={{ color: isStale ? "#E65100" : "#2D7D46" }}
      >
        <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        {isSyncing ? "Laden..." : "Vernieuwen"}
      </button>
    </div>
  );
}
