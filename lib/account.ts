import { Capacitor, registerPlugin } from "@capacitor/core";
import { resetUserCache } from "@/lib/auth";
import { apiUrl, IS_NATIVE_BUILD } from "@/lib/links";
import { refreshPremium } from "@/lib/premium";
import { supabase } from "@/lib/supabase";

// Inloggen, uitloggen en account verwijderen.
//
// Inloggen geeft altijd een normaal account (nieuw of bestaand). Daarna verhuist
// /api/account/merge de gegevens van het anonieme account op dit apparaat en
// wordt dat anonieme account opgeheven. Zo werkt inloggen op een tweede
// apparaat met een bestaand account ook.

const PENDING_MERGE_KEY = "tulipday_pending_merge";

// Eigen native plugin: ios/App/App/AppleSignInPlugin.swift
type AppleSignInPlugin = {
  authorize(options: { nonce: string }): Promise<{ identityToken: string }>;
};
const AppleSignIn = registerPlugin<AppleSignInPlugin>("AppleSignIn");

export type AccountInfo = {
  isAnonymous: boolean;
  email:       string | null;
  provider:    "email" | "apple" | null;
};

export async function getAccount(): Promise<AccountInfo | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session.user;
  const provider = user.app_metadata?.provider;
  return {
    isAnonymous: !!user.is_anonymous,
    email:       user.email ?? null,
    provider:    provider === "apple" ? "apple" : provider === "email" ? "email" : null,
  };
}

/** Sign in with Apple: op iOS native, op het web via redirect, op Android niet. */
export function appleSignInAvailable(): boolean {
  return !IS_NATIVE_BUILD || Capacitor.getPlatform() === "ios";
}

// ── E-mail met 6-cijferige code ──────────────────────────────────────────────

export async function sendEmailCode(email: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return !error;
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const anonToken = await currentAnonToken();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return false;
  await afterSignIn(anonToken);
  return true;
}

// ── Sign in with Apple ───────────────────────────────────────────────────────

/** Native: returnt true/false. Web: stuurt de browser door naar Apple. */
export async function signInWithApple(locale: string): Promise<boolean> {
  const anonToken = await currentAnonToken();

  if (IS_NATIVE_BUILD) {
    const rawNonce = crypto.randomUUID();
    try {
      const { identityToken } = await AppleSignIn.authorize({ nonce: await sha256Hex(rawNonce) });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token:    identityToken,
        nonce:    rawNonce,
      });
      if (error) return false;
    } catch {
      return false; // geannuleerd of mislukt
    }
    await afterSignIn(anonToken);
    return true;
  }

  // Web: na terugkomst rondt finishPendingSignIn() de samenvoeging af
  if (anonToken) localStorage.setItem(PENDING_MERGE_KEY, anonToken);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options:  { redirectTo: `${window.location.origin}/${locale}/account/` },
  });
  return !error;
}

/** Aanroepen op de accountpagina, voor terugkomst van de Apple-redirect op het web. */
export async function finishPendingSignIn(): Promise<void> {
  const anonToken = localStorage.getItem(PENDING_MERGE_KEY);
  if (!anonToken) return;

  const code = new URL(window.location.href).searchParams.get("code");
  if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => undefined);

  const account = await getAccount();
  if (!account || account.isAnonymous) return; // redirect nog niet verwerkt
  localStorage.removeItem(PENDING_MERGE_KEY);
  await afterSignIn(anonToken);
}

// ── Uitloggen & verwijderen ──────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  afterSessionEnded();
}

export async function deleteAccount(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const res = await fetch(apiUrl("/api/account/delete"), {
    method:  "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  }).catch(() => null);
  if (!res?.ok) return false;
  await supabase.auth.signOut({ scope: "local" });
  afterSessionEnded();
  return true;
}

// ── Intern ───────────────────────────────────────────────────────────────────

async function currentAnonToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.is_anonymous ? session.access_token : null;
}

async function afterSignIn(anonToken: string | null): Promise<void> {
  resetUserCache();
  const { data: { session } } = await supabase.auth.getSession();
  if (anonToken && session) {
    await fetch(apiUrl("/api/account/merge"), {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify({ anonToken }),
    }).catch(() => undefined);
  }
  await refreshPremium();
}

function afterSessionEnded(): void {
  resetUserCache();
  localStorage.removeItem("tulipday_premium_season");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
