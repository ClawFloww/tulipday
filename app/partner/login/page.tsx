"use client";

// Magic-link login voor het Partner Portal. We sturen een OTP-link naar het
// opgegeven adres en laten Supabase de redirect afhandelen via
// /partner/auth/callback. Geen wachtwoord-flow — partners zijn niet-tech-
// savvy en moeten in 2 taps kunnen inloggen.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "sending" | "sent";

export default function PartnerLogin() {
  const searchParams = useSearchParams();
  const errorCode    = searchParams.get("error");

  const [email,  setEmail]  = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error,  setError]  = useState<string | null>(null);

  // Toon eventuele callback-foutmelding (bv. no_partner_account)
  useEffect(() => {
    if (errorCode === "no_partner_account") {
      setError(
        "Geen partner-account gevonden voor dit emailadres. Neem contact op via info@tulipday.online.",
      );
    } else if (errorCode === "no_session") {
      setError("Inloglink is verlopen of ongeldig. Stuur opnieuw een link.");
    }
  }, [errorCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const callbackUrl = `${window.location.origin}/partner/auth/callback`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (otpError) throw new Error(otpError.message);
      setStatus("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Kon geen inloglink versturen: ${msg}`);
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
        style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        {/* Logo + titel */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: "#E8102A" }}
            aria-hidden
          >
            🌷
          </div>
          <div>
            <p className="text-xs font-extrabold tracking-wider uppercase text-tulip-500">TulipDay</p>
            <p className="text-base font-extrabold leading-none" style={{ color: "var(--color-text)" }}>
              Partner Portal
            </p>
          </div>
        </div>

        {status === "sent" ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(45,125,70,0.15)" }}
            >
              <Mail size={22} style={{ color: "#2D7D46" }} />
            </div>
            <p className="text-sm font-extrabold mb-1" style={{ color: "var(--color-text)" }}>
              Check je inbox
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-2)" }}>
              We hebben een inloglink gestuurd naar <span className="font-semibold">{email}</span>.
            </p>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="mt-5 text-xs font-bold text-tulip-500 underline underline-offset-2"
            >
              Ander mailadres gebruiken
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-2)" }}>
              Log in om je status bij te werken.
            </p>

            <label className="block text-[11px] font-extrabold tracking-wider uppercase mb-1"
                   style={{ color: "var(--color-text-3)" }}>
              E-mailadres
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              className="w-full px-3 py-3 rounded-xl text-sm outline-none mb-3"
              style={{
                backgroundColor: "var(--color-surface-3)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            />

            <button
              type="submit"
              disabled={status === "sending" || !email}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: "#E8102A",
                boxShadow: "0 4px 14px rgba(232,16,42,0.32)",
              }}
            >
              {status === "sending" && <Loader2 size={15} className="animate-spin" />}
              Stuur inloglink
            </button>

            {error && (
              <p
                className="mt-4 text-xs font-semibold p-3 rounded-lg"
                style={{
                  backgroundColor: "rgba(232,16,42,0.08)",
                  color: "#E8102A",
                  border: "1px solid rgba(232,16,42,0.2)",
                }}
              >
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
