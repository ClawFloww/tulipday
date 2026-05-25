"use client";

// /partner — redirect naar login of dashboard afhankelijk van auth-state.
// We doen dit client-side omdat de Supabase sessie in de browser leeft
// (geen SSR-cookies in deze MVP).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PartnerIndex() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      router.replace(session?.user ? "/partner/dashboard" : "/partner/login");
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#E8102A", borderTopColor: "transparent" }}
      />
    </div>
  );
}
