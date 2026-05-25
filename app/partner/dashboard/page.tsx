"use client";

// Dashboard-route. Laadt client-side de partner-sessie en delegeert naar
// DashboardClient. Bij missende sessie of ontbrekende partner-koppeling
// gaat de gebruiker terug naar /partner/login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPartnerSession } from "@/lib/partner/auth";
import type { PartnerSession } from "@/lib/partner/types";
import { DashboardClient } from "./DashboardClient";

export default function PartnerDashboardPage() {
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

  return <DashboardClient session={session} />;
}
