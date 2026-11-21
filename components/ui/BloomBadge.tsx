"use client";

import { useT } from "@/lib/i18n-context";
import { Badge } from "@/components/ui/Badge";
import type { BloomStatus } from "@/lib/types";

// Bloeistatus van een locatie; kleuren via design tokens (werkt in dark mode)
const TONE: Record<BloomStatus, { tone: "success" | "warning" | "neutral"; dot: string }> = {
  peak:     { tone: "success", dot: "bg-success" },
  blooming: { tone: "warning", dot: "bg-warning" },
  early:    { tone: "neutral", dot: "bg-ink-3"   },
  ending:   { tone: "neutral", dot: "bg-ink-3"   },
};

export function BloomBadge({ status }: { status: BloomStatus | null }) {
  const { t } = useT();
  if (!status || !TONE[status]) return null;
  const { tone, dot } = TONE[status];

  return (
    <Badge tone={tone} icon={<span className={`block w-1.5 h-1.5 rounded-full ${dot}`} />}>
      {t(`bloom.${status}`)}
    </Badge>
  );
}
