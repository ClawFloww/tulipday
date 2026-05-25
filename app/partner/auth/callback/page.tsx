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
      // PKCE-flow: Supabase stuurt ?code=... in de query. We wisselen die
      // expliciet voor een sessie i.p.v. te wachten tot detectSessionInUrl
      // het impliciet doet (was niet betrouwbaar genoeg).
      try {
        const url  = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // exchange-fout zelf negeren — onderstaande getSession-check
        // valt anders alsnog terug op no_session.
      }

      // Hash-based magic links worden door supabase-js automatisch
      // gedetecteerd in localStorage; een korte tick geeft 'm tijd.
      await new Promise((r) => setTimeout(r, 200));

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
