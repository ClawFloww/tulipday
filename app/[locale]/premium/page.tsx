"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { getOrCreateSessionId } from "@/lib/session";
import { useT } from "@/lib/i18n-context";

const FEATURE_DEFS = [
  { labelKey: "premium.feature_10_locations",     free: true,  season: true },
  { labelKey: "premium.feature_all_locations",    free: false, season: true },
  { labelKey: "premium.feature_2_routes",         free: true,  season: true },
  { labelKey: "premium.feature_all_routes",       free: false, season: true },
  { labelKey: "premium.feature_basic_map",        free: true,  season: true },
  { labelKey: "premium.feature_bloom_alerts",     free: false, season: true },
  { labelKey: "premium.feature_street_view",      free: false, season: true },
  { labelKey: "premium.feature_exclusive_routes", free: false, season: true },
];

const CARD_FEATURE_DEFS = [
  { emoji: "📍", labelKey: "premium.feature_all_locations" },
  { emoji: "🗺️", labelKey: "premium.feature_all_routes"    },
  { emoji: "🌸", labelKey: "premium.feature_bloom_alerts"  },
  { emoji: "🚲", labelKey: "premium.card_label_exclusive"  },
  { emoji: "📵", labelKey: "premium.card_label_offline"    },
  { emoji: "🔭", labelKey: "premium.feature_street_view"   },
];

const SEASON_PRICE_ID = "price_1TQ3MiCMTdZLUsIufuuGl3vb";

export default function PremiumPage() {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function handleCheckout() {
    setBusy(true);
    try {
      const res = await fetch("/api/premium/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ priceId: SEASON_PRICE_ID, sessionId: getOrCreateSessionId() }),
      });
      const { url, error } = await res.json();
      if (error || !url) { activateDemo(); return; }
      window.location.href = url;
    } catch {
      activateDemo();
    } finally {
      setBusy(false);
    }
  }

  function activateDemo() {
    localStorage.setItem("tulipday_premium", "true");
    router.push("/home");
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4"
           style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[17px] font-bold leading-tight" style={{ color: "var(--color-text)" }}>
            {t("premium.title")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
            {t("premium.subtitle")}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Feature vergelijkingstabel */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          {/* Kolomheader */}
          <div className="grid grid-cols-3 px-4 py-2.5" style={{ backgroundColor: "var(--color-surface-3)", borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-3)" }}>{t("premium.col_feature")}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-center" style={{ color: "var(--color-text-3)" }}>{t("premium.col_free")}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-center text-tulip-500">{t("premium.col_season")}</span>
          </div>
          {/* Rijen */}
          {FEATURE_DEFS.map((f, i) => (
            <div
              key={f.labelKey}
              className="grid grid-cols-3 items-center px-4 py-3"
              style={i > 0 ? { borderTop: "1px solid var(--color-border)" } : {}}
            >
              <span className="text-sm" style={{ color: "var(--color-text-2)" }}>{t(f.labelKey)}</span>
              <div className="flex justify-center">
                {f.free
                  ? <Check size={15} className="text-green-500" strokeWidth={3} />
                  : <span className="text-sm font-bold" style={{ color: "var(--color-text-3)", opacity: 0.35 }}>—</span>
                }
              </div>
              <div className="flex justify-center">
                <Check size={15} className="text-tulip-500" strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>

        {/* Seizoenspas kaart */}
        <div className="rounded-[22px] p-5 relative overflow-hidden" style={{ backgroundColor: "#E8102A", boxShadow: "0 16px 48px rgba(232,16,42,0.28)" }}>
          {/* Achtergrond tulp */}
          <div className="absolute right-[-4px] top-[-8px] text-[90px] opacity-10 rotate-12 select-none pointer-events-none">🌷</div>

          {/* Prijs */}
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-white/60 mb-1">{t("premium.season_pass_label")}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[42px] font-extrabold text-white leading-none tracking-tight">€4,99</span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">{t("premium.season_full_period")}</p>
            </div>
            <div className="shrink-0 mt-1 px-3 py-1.5 rounded-full text-[10.5px] font-medium text-white/85"
                 style={{ backgroundColor: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.2)" }}>
              {t("premium.valid_until")}
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {CARD_FEATURE_DEFS.map((f) => (
              <div key={f.labelKey} className="flex items-center gap-2 text-[12px] text-white/85">
                <span className="text-[13px]">{f.emoji}</span>
                {t(f.labelKey)}
              </div>
            ))}
          </div>

          {/* CTA knop */}
          <button
            onClick={handleCheckout}
            disabled={busy}
            className="w-full py-4 rounded-[13px] bg-white text-[14.5px] font-bold tracking-[-0.2px] active:scale-[0.97] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ color: "#E8102A" }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {t("premium.activate_cta")}
          </button>
        </div>

        {/* Vroegboekers-banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
             style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <span className="text-[17px] flex-shrink-0 mt-0.5">🌱</span>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--color-text-3)" }}>
            <span className="font-semibold" style={{ color: "var(--color-text-2)" }}>{t("premium.early_bird_label")}</span>{" "}
            {t("premium.early_bird_body")}
          </p>
        </div>

        {/* Overslaan */}
        <button
          onClick={() => router.back()}
          className="w-full text-center text-[12.5px] py-3 underline underline-offset-2"
          style={{ color: "var(--color-text-3)" }}
        >
          {t("premium.continue_free")}
        </button>

        <p className="text-center text-[11px] pb-2" style={{ color: "var(--color-text-3)" }}>
          {t("premium.payment_footer")}
        </p>

      </div>
    </div>
  );
}
