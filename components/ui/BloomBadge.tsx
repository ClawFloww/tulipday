"use client";

import { BloomStatus } from "@/lib/types";
import { useT } from "@/lib/i18n-context";

const STYLE: Record<BloomStatus, { dot: string; bg: string; text: string }> = {
  peak:     { dot: "bg-forest-500", bg: "bg-forest-50",  text: "text-forest-600" },
  blooming: { dot: "bg-yellow-400", bg: "bg-yellow-50",  text: "text-yellow-700" },
  early:    { dot: "bg-gray-400",   bg: "bg-gray-100",   text: "text-gray-500"   },
  ending:   { dot: "bg-gray-300",   bg: "bg-gray-100",   text: "text-gray-400"   },
};

export function BloomBadge({ status }: { status: BloomStatus | null }) {
  const { t } = useT();
  if (!status || !STYLE[status]) return null;
  const { dot, bg, text } = STYLE[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {t(`bloom.${status}`)}
    </span>
  );
}
