"use client";

// Callback voor de magic-link-redirect. @supabase/supabase-js detecteert de
// tokens in de URL en zet de sessie zelf op. Wij checken vervolgens of de
// ingelogde user een partner_users-koppeling heeft. Zo niet: terug naar de
// login-pagina met een Nederlandse foutmelding.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PartnerAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      // Geef supabase-js een tick om de URL-hash/query te lezen en de
      // sessie in localStorage te schrijven.
      await new Promise((r) => setTimeout(r, 300));

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        router.replace("/partner/login?error=no_session");
        return;
      }

      // RLS limiteert deze SELECT tot de eigen rij van de huidige user.
      const { data: link } = await supabase
        .from("partner_users")
        .select("partner_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!link) {
        await supabase.auth.signOut();
        router.replace("/partner/login?error=no_partner_account");
        return;
      }

      router.replace("/partner/dashboard");
    }

    finalize();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
      <div
        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#E8102A", borderTopColor: "transparent" }}
      />
      <p className="text-sm" style={{ color: "var(--color-text-2)" }}>Even inloggen…</p>
    </div>
  );
}
