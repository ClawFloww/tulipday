"use client";

// Dashboard-pagina. We werken MVP-fase client-side; getPartnerSession() leest
// de huidige sessie + gekoppelde partner + locations. Geen sessie of geen
// koppeling → router stuurt terug naar login. Het echte dashboard-werk
// gebeurt in DashboardClient (komt in Fase 3).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPartnerSession } from "@/lib/partner/auth";
import type { PartnerSession } from "@/lib/partner/types";
import { PartnerHeader } from "@/components/partner/PartnerHeader";

export default function PartnerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getPartnerSession();
      if (cancelled) return;
      if (!s) {
        router.replace("/partner/login");
        return;
      }
      setSession(s);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!loaded || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#E8102A", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const loc = session.partnerLocations[0];

  return (
    <div className="min-h-screen">
      <PartnerHeader />
      <main className="px-4 py-5 max-w-md mx-auto">
        <p className="text-lg font-extrabold mb-1" style={{ color: "var(--color-text)" }}>
          👋 Hallo, {session.partner.name}
        </p>
        {loc?.location && (
          <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
            📍 {loc.location.title}
          </p>
        )}
        {loc && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
            🏷️ {loc.category}
          </p>
        )}

        {/* Fase 3 plaatst hier de huidige-status-kaart + 'Status bijwerken' knop */}
        <div
          className="mt-6 rounded-2xl p-5 text-center"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            Dashboard wordt in Fase 3 ingevuld.
          </p>
        </div>
      </main>
    </div>
  );
}
