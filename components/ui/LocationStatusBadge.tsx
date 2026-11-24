"use client";

// Compacte status-badge op LocationCard voor recente partner-updates: bloei
// (vertaald naar de app-brede bloeistatus) of open/dicht met drukte.
// Het title-attribuut toont wanneer en door wie het is bijgewerkt.

import { formatDistanceToNow } from "date-fns";
import { de, enGB, es, fr, nl, zhCN } from "date-fns/locale";
import { useT } from "@/lib/i18n-context";
import { fromPartnerPhase } from "@/lib/bloomStatus";
import { Badge } from "@/components/ui/Badge";
import { BloomBadge } from "@/components/ui/BloomBadge";
import type { LocationPartnerStatus } from "@/hooks/useLocationStatuses";

const DATE_LOCALE = { nl, en: enGB, de, fr, es, zh: zhCN } as const;

// Volledige klassenamen, zodat Tailwind ze vindt
const OPERATIONAL: Record<string, { tone: "success" | "warning" | "danger"; dot: string }> = {
  open:         { tone: "success", dot: "bg-success" },
  closing_soon: { tone: "warning", dot: "bg-warning" },
  closed:       { tone: "danger",  dot: "bg-danger"  },
};

interface Props {
  status: LocationPartnerStatus;
}

export function LocationStatusBadge({ status }: Props) {
  const { t, locale } = useT();

  const updated = formatDistanceToNow(new Date(status.updated_at), {
    locale: DATE_LOCALE[locale as keyof typeof DATE_LOCALE] ?? nl,
    addSuffix: true,
  });
  let tooltip = t("partner_status.updated_by", { time: updated, partner: status.partner_name });
  if (status.notes) tooltip += ` — "${status.notes}"`;

  if (status.kind === "bloom") {
    const bloom = fromPartnerPhase(status.status);
    if (!bloom) return null;
    return <span title={tooltip}><BloomBadge status={bloom} /></span>;
  }

  const op = OPERATIONAL[status.status];
  if (!op) return null;
  const label = t(`partner_status.${status.status}`);
  const crowd = status.crowd ? t(`partner_status.crowd_${status.crowd}`) : null;

  return (
    <span title={tooltip}>
      <Badge tone={op.tone} icon={<span className={`block h-1.5 w-1.5 rounded-full ${op.dot}`} />}>
        <span className="block max-w-[140px] truncate">{crowd ? `${label} · ${crowd}` : label}</span>
      </Badge>
    </span>
  );
}
