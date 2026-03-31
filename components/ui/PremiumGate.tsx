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
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl z-10 px-6 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-tulip-50 flex items-center justify-center mb-3">
          <Lock size={22} className="text-tulip-500" />
        </div>
        <p className="text-sm font-extrabold text-gray-900 mb-1">Premium feature</p>
        <p className="text-xs text-gray-500 mb-4">From €2,99/month or €9,99/season</p>
        <a
          href="/premium"
          className="px-5 py-2.5 rounded-xl bg-tulip-500 text-white text-sm font-bold hover:bg-tulip-600 active:scale-95 transition-all"
        >
          Upgrade
        </a>
      </div>
    </div>
  );
}
