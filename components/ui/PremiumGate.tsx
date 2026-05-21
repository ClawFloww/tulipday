"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { isPremium } from "@/lib/premium";

interface Props {
  children: React.ReactNode;
}

export function PremiumGate({ children }: Props) {
  const [premium, setPremium] = useState(true); // default true to avoid flash

  useEffect(() => {
    setPremium(isPremium());
  }, []);

  if (premium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>

      {/* Rode seizoenspas-banner — zelfde stijl als /premium pagina */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-3">
        <div
          className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl text-center"
          style={{ backgroundColor: "#E8102A", color: "#ffffff" }}
        >
          <div className="px-5 pt-5 pb-4">
            <div className="w-11 h-11 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Lock size={20} className="text-white" />
            </div>
            <p className="text-[11px] font-extrabold tracking-wider uppercase text-white/80 mb-2">
              Seizoenspas 2026
            </p>
            <p className="text-3xl font-extrabold leading-none">€4,99</p>
            <p className="text-xs text-white/80 mt-1">heel tulpenseizoen</p>
          </div>
          <a
            href="/premium"
            className="block w-full py-3 bg-white text-sm font-extrabold active:scale-[0.99] transition-transform"
            style={{ color: "#E8102A" }}
          >
            Activeer seizoenspas
          </a>
        </div>
      </div>

      {/* Vroegboekers-notitie onder de card, klein */}
      <p
        className="absolute left-0 right-0 bottom-2 text-center text-[10px] font-semibold z-10 px-4"
        style={{ color: "var(--color-text-3)" }}
      >
        🌱 Vroegboeker: €2,99 voor bestaande gebruikers in feb 2027
      </p>
    </div>
  );
}
