"use client";

import { useT } from "@/lib/i18n-context";
import { BLOOM_TONE } from "@/lib/bloomStatus";
import { Badge } from "@/components/ui/Badge";
import type { BloomStatus } from "@/lib/types";

// Bloeistatus van een locatie; kleuren via design tokens (werkt in dark mode)
export function BloomBadge({ status }: { status: BloomStatus | null }) {
  const { t } = useT();
  if (!status || !BLOOM_TONE[status]) return null;
  const { tone, dot } = BLOOM_TONE[status];

  return (
    <Badge tone={tone} icon={<span className={`block w-1.5 h-1.5 rounded-full ${dot}`} />}>
      {t(`bloom.${status}`)}
    </Badge>
  );
}
