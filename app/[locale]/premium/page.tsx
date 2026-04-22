"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Star, Loader2 } from "lucide-react";
import { useState } from "react";
import { PREMIUM_FEATURES } from "@/lib/premium";
import { getOrCreateSessionId } from "@/lib/session";

const ALL_FEATURES = [
  { label: "10 locaties",          free: true,  premium: true },
  { label: "Alle locaties",        free: false, premium: true },
  { label: "2 routes",             free: true,  premium: true },
  { label: "Alle routes",          free: false, premium: true },
  { label: "Basis kaart",          free: true,  premium: true },
  { label: "Bloei-alerts",         free: false, premium: true },
  { label: "Street View",          free: false, premium: true },
  { label: "Exclusieve routes",    free: false, premium: true },
];

const stripeConfigured = true; // Keys configured

export default function PremiumPage() {
  const router  = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleCheckout(plan: "monthly" | "season") {
    const priceId = plan === "monthly"
      ? "price_1TNzeGCMTdZLUsIuZ9w2O8Vk"
      : "price_1TNzeGCMTdZLUsIuoBlniI6q";

    if (!stripeConfigured) {
      activateDemo();
      return;
    }

    setBusy(plan);
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, sessionId: getOrCreateSessionId() }),
      });
      const { url, error } = await res.json();
      if (error || !url) { activateDemo(); return; }
      window.location.href = url;
    } catch {
      activateDemo();
    } finally {
      setBusy(null);
    }
  }

  function activateDemo() {
    localStorage.setItem("tulipday_premium", "true");
    router.push("/home");
  }

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="px-5 pt-12 pb-5" style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>🌷 TulipDay Premium</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: "var(--color-text-3)" }}>Alles uit het tulpenseizoen halen</p>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Feature comparison */}
        <div className="rounded-2xl shadow-card overflow-hidden" style={{ backgroundColor: "var(--color-surface-2)" }}>
          <div className="grid grid-cols-3" style={{ backgroundColor: "var(--color-surface-3)", borderBottom: "1px solid var(--color-border)" }}>
            <div className="py-3 px-4 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-3)" }}>Feature</div>
            <div className="py-3 px-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-3)" }}>Gratis</div>
            <div className="py-3 px-2 text-center text-xs font-bold uppercase tracking-wide text-tulip-600">Premium</div>
          </div>
          <div style={{ borderTop: "1px solid var(--color-border)" }}>
            {ALL_FEATURES.map((f, i) => (
              <div key={f.label} className="grid grid-cols-3 items-center px-1 py-2.5"
                   style={i > 0 ? { borderTop: "1px solid var(--color-border)" } : {}}>
                <span className="px-3 text-sm" style={{ color: "var(--color-text-2)" }}>{f.label}</span>
                <div className="flex justify-center">
                  {f.free ? <Check size={16} className="text-green-500" strokeWidth={3} />
                           : <span className="font-bold text-base" style={{ color: "var(--color-text-3)" }}>–</span>}
                </div>
                <div className="flex justify-center">
                  <Check size={16} className="text-tulip-500" strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          {/* Monthly */}
          <div className="rounded-2xl shadow-card p-5 flex flex-col" style={{ backgroundColor: "var(--color-surface-2)" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-3)" }}>Maandelijks</p>
            <p className="text-2xl font-extrabold mb-0.5" style={{ color: "var(--color-text)" }}>€2,99</p>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-3)" }}>per maand</p>
            <ul className="space-y-2 flex-1 mb-4">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-2)" }}>
                  <Check size={11} className="text-tulip-500 flex-shrink-0" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleCheckout("monthly")} disabled={!!busy}
              className="w-full py-2.5 rounded-xl border-2 border-tulip-500 text-tulip-600 text-sm font-bold hover:bg-tulip-50 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {busy === "monthly" ? <Loader2 size={14} className="animate-spin" /> : null}
              Kies maandelijks
            </button>
          </div>

          {/* Season — best value */}
          <div className="bg-tulip-500 rounded-2xl shadow-card p-5 flex flex-col relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 text-[10px] font-extrabold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                <Star size={9} fill="currentColor" /> Beste deal
              </span>
            </div>
            <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Seizoen</p>
            <p className="text-2xl font-extrabold text-white mb-0.5">€9,99</p>
            <p className="text-xs text-white/60 mb-4">heel tulpenseizoen</p>
            <ul className="space-y-2 flex-1 mb-4">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-white/90">
                  <Check size={11} className="text-white flex-shrink-0" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleCheckout("season")} disabled={!!busy}
              className="w-full py-2.5 rounded-xl bg-white text-tulip-600 text-sm font-bold hover:bg-tulip-50 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {busy === "season" ? <Loader2 size={14} className="animate-spin" /> : null}
              Kies seizoen
            </button>
          </div>
        </div>

        {!stripeConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-amber-700 font-semibold mb-3">Demo mode — activeer premium gratis</p>
            <button onClick={activateDemo}
              className="px-6 py-3 rounded-xl bg-tulip-500 text-white text-sm font-bold hover:bg-tulip-600 active:scale-95 transition-all shadow-sm">
              Activeer Premium (Demo)
            </button>
          </div>
        )}

        <p className="text-center text-xs pb-4" style={{ color: "var(--color-text-3)" }}>
          iDEAL & creditcard · Eenvoudig opzegbaar · Tulpenseizoen april–mei
        </p>
      </div>
    </div>
  );
}
