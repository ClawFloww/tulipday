"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bell, Bike, Check, CheckCircle2, CloudOff, Eye, Flower2, Loader2, MapPin, Route as RouteIcon, Sprout,
  type LucideIcon,
} from "lucide-react";
import { ensureUser } from "@/lib/auth";
import { tap } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";
import { apiUrl } from "@/lib/links";
import { supabase } from "@/lib/supabase";
import {
  isPremium,
  refreshPremium,
  CURRENT_SEASON_YEAR,
  CURRENT_SEASON_PRICE,
  EARLY_BIRD_YEAR,
  EARLY_BIRD_PRICE,
  EARLY_BIRD_FROM_MONTH,
  formatPriceEur,
} from "@/lib/premium";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

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

const CARD_FEATURE_DEFS: { Icon: LucideIcon; labelKey: string }[] = [
  { Icon: MapPin,    labelKey: "premium.feature_all_locations" },
  { Icon: RouteIcon, labelKey: "premium.feature_all_routes"    },
  { Icon: Bell,      labelKey: "premium.feature_bloom_alerts"  },
  { Icon: Bike,      labelKey: "premium.card_label_exclusive"  },
  { Icon: CloudOff,  labelKey: "premium.card_label_offline"    },
  { Icon: Eye,       labelKey: "premium.feature_street_view"   },
];

export default function PremiumPage() {
  const router = useRouter();
  const { t, locale } = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [premium, setPremium] = useState(false);

  useEffect(() => { setPremium(isPremium()); refreshPremium().then(setPremium); }, []);

  async function handleCheckout() {
    tap();
    setBusy(true);
    setFailed(false);
    try {
      // De aankoop wordt aan het account gekoppeld; de server leest de gebruiker uit het token
      await ensureUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("no session");

      const res = await fetch(apiUrl("/api/premium/checkout"), {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ locale }),
      });
      const { url } = await res.json();
      if (!res.ok || !url) throw new Error("checkout failed");
      window.location.href = url;
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">

      <header className="px-5 pt-safe bg-surface-2 border-b border-line">
        <div className="flex items-center gap-3 pt-6 pb-4">
          <IconButton variant="ghost" aria-label={t("common.back")} onClick={() => router.back()} className="-ml-2.5">
            <ArrowLeft size={20} />
          </IconButton>
          <div>
            <h1 className="text-headline text-ink">{t("premium.title")}</h1>
            <p className="text-caption mt-0.5 text-ink-3">{t("premium.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">

        {/* Vergelijkingstabel gratis vs. seizoenspas */}
        <div className="rounded-2xl overflow-hidden bg-surface-2 border border-line shadow-card">
          <div className="grid grid-cols-[1fr_72px_72px] px-4 py-2.5 bg-surface-3 border-b border-line">
            <span className="text-caption font-bold uppercase tracking-widest text-ink-3">{t("premium.col_feature")}</span>
            <span className="text-caption font-bold uppercase tracking-widest text-center text-ink-3">{t("premium.col_free")}</span>
            <span className="text-caption font-bold uppercase tracking-widest text-center text-primary">{t("premium.col_season")}</span>
          </div>
          {FEATURE_DEFS.map((f, i) => (
            <div key={f.labelKey}
                 className={`grid grid-cols-[1fr_72px_72px] items-center px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="text-body text-ink-2">{t(f.labelKey)}</span>
              <span className="flex justify-center">
                {f.free
                  ? <Check size={16} className="text-success" strokeWidth={3} aria-label="✓" />
                  : <span className="text-body font-bold text-ink-3 opacity-40" aria-hidden>—</span>}
              </span>
              <span className="flex justify-center">
                <Check size={16} className="text-primary" strokeWidth={3} aria-label="✓" />
              </span>
            </div>
          ))}
        </div>

        {/* Seizoenspas-kaart */}
        <div className="rounded-3xl p-5 relative overflow-hidden bg-primary text-on-primary shadow-lg">
          <Flower2 aria-hidden size={140} strokeWidth={1.2}
                   className="absolute -right-6 -top-6 opacity-[0.12] rotate-12 pointer-events-none" />

          <div className="relative flex items-start justify-between mb-4 gap-3">
            <div>
              <p className="text-caption font-bold uppercase tracking-widest text-white/70 mb-1">
                {t("premium.season_pass_label", { year: CURRENT_SEASON_YEAR })}
              </p>
              <span className="block text-[42px] font-extrabold leading-none tracking-tight font-mono">
                {formatPriceEur(CURRENT_SEASON_PRICE)}
              </span>
              <p className="text-caption text-white/70 mt-1">{t("premium.season_full_period")}</p>
            </div>
            <span className="shrink-0 mt-1 px-3 py-1.5 rounded-full text-caption text-white/90 bg-black/20 border border-white/20">
              {t("premium.valid_until", { year: CURRENT_SEASON_YEAR })}
            </span>
          </div>

          <ul className="relative grid grid-cols-2 gap-x-2 gap-y-2.5 mb-5">
            {CARD_FEATURE_DEFS.map(({ Icon, labelKey }) => (
              <li key={labelKey} className="flex items-center gap-2 text-label text-white/90">
                <Icon size={15} className="flex-shrink-0" aria-hidden />
                {t(labelKey)}
              </li>
            ))}
          </ul>

          {premium ? (
            <p className="relative flex items-center justify-center gap-2 min-h-[54px] rounded-2xl bg-white/15 text-headline">
              <CheckCircle2 size={18} aria-hidden /> {t("premium.already_active")}
            </p>
          ) : (
            <>
              {/* Witte knop op rood vlak: omgekeerde primaire knop */}
              <button
                onClick={handleCheckout}
                disabled={busy}
                className="relative w-full min-h-[54px] rounded-2xl bg-white text-primary text-headline
                           flex items-center justify-center gap-2 shadow-md
                           active:scale-[0.97] transition-transform duration-fast disabled:opacity-60
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
                {t("premium.activate_cta")}
              </button>
              {failed && (
                <p role="alert" className="relative mt-2 text-center text-label text-white">
                  {t("premium.checkout_error")}
                </p>
              )}
            </>
          )}
        </div>

        {/* Vroegboekers */}
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-surface-2 border border-line">
          <Sprout size={18} className="flex-shrink-0 mt-0.5 text-success" aria-hidden />
          <p className="text-label font-normal leading-relaxed text-ink-3">
            <span className="font-semibold text-ink-2">{t("premium.early_bird_label")}</span>{" "}
            {t("premium.early_bird_body", {
              price: formatPriceEur(EARLY_BIRD_PRICE),
              month: EARLY_BIRD_FROM_MONTH,
              year:  EARLY_BIRD_YEAR,
            })}
          </p>
        </div>

        {!premium && (
          <Button variant="ghost" fullWidth onClick={() => router.back()}>
            {t("premium.continue_free")}
          </Button>
        )}

        <p className="text-center text-caption pb-2 text-ink-3">
          {t("premium.payment_footer", { year: CURRENT_SEASON_YEAR })}
        </p>

      </div>
    </div>
  );
}
