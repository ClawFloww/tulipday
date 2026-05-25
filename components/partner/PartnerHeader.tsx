"use client";

// Vaste header voor het Partner Portal — TulipDay-logo links, label
// "Partner Portal" en logout-icoon rechts. Niet sticky (de pagina's zijn
// kort genoeg om gewoon mee te scrollen).

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { partnerSignOut } from "@/lib/partner/auth";

export function PartnerHeader() {
  const router = useRouter();

  async function handleLogout() {
    await partnerSignOut();
    router.replace("/partner/login");
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ backgroundColor: "#E8102A" }}
          aria-hidden
        >
          🌷
        </div>
        <div>
          <p className="text-[10px] font-extrabold tracking-wider uppercase text-tulip-500 leading-none">
            TulipDay
          </p>
          <p className="text-sm font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
            Partner Portal
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        aria-label="Uitloggen"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
