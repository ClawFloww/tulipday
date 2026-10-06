"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { refreshPremium } from "@/lib/premium";

// De Stripe-webhook zet premium op de server; dat kan een paar seconden duren
const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS    = 15;

type Status = "checking" | "active" | "pending";

export default function PremiumSuccessPage() {
  const router = useRouter();
  const { t, locale } = useT();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll(attempt: number) {
      const active = await refreshPremium();
      if (cancelled) return;
      if (active) {
        setStatus("active");
        timer = setTimeout(() => router.replace(`/${locale}/home`), 3000);
      } else if (attempt + 1 >= POLL_ATTEMPTS) {
        setStatus("pending");
      } else {
        timer = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
      }
    }
    poll(0);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [router, locale]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
         style={{ backgroundColor: "var(--color-surface)" }}>
      {status === "active"
        ? <CheckCircle size={64} className="text-green-500 mb-4" />
        : <Loader2 size={48} className="text-tulip-500 mb-4 animate-spin" />}

      <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>
        {status === "active" ? t("premium.success_title") : t("premium.success_checking")}
      </h1>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--color-text-3)" }}>
        {status === "active" && t("premium.success_body")}
        {status === "pending" && t("premium.success_pending")}
      </p>

      <button
        onClick={() => router.replace(`/${locale}/home`)}
        className="px-8 py-3 rounded-xl bg-tulip-500 text-white font-bold hover:bg-tulip-600 active:scale-95 transition-all"
      >
        {t("premium.success_cta")}
      </button>
    </div>
  );
}
