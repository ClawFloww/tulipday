"use client";

// Compacte promo-banner bovenaan de home-pagina voor niet-premium gebruikers.
// Toont de huidige seizoenspas-prijs en linkt naar /premium. Verbergt zichzelf
// automatisch zodra de gebruiker premium heeft geactiveerd.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import {
  isPremium,
  formatPriceEur,
  CURRENT_SEASON_YEAR,
  CURRENT_SEASON_PRICE,
} from "@/lib/premium";

interface Props {
  locale: string;
}

export function PremiumPromoBanner({ locale }: Props) {
  const { t } = useT();
  const [premium, setPremium] = useState(true); // default true tijdens hydratie zodat hij niet eerst flitst

  useEffect(() => {
    setPremium(isPremium());
  }, []);

  if (premium) return null;

  return (
    <div className="px-5 mb-5">
      <Link
        href={`/${locale}/premium`}
        className="block w-full rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
        style={{
          backgroundColor: "#E8102A",
          boxShadow: "0 6px 18px rgba(232,16,42,0.32)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 text-white">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Lock size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold tracking-wider uppercase text-white/80">
              {t("premium.gate_eyebrow", { year: CURRENT_SEASON_YEAR })}
            </p>
            <p className="text-sm font-extrabold leading-tight mt-0.5">
              {formatPriceEur(CURRENT_SEASON_PRICE)} · {t("premium.gate_period")}
            </p>
          </div>
          <ChevronRight size={18} className="text-white flex-shrink-0" />
        </div>
      </Link>
    </div>
  );
}
