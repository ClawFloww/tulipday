import { IS_NATIVE_BUILD } from "@/lib/links";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";

const LEGACY_CLAIMED_KEY = "tulipday_legacy_claimed";

let pending: Promise<string | null> | null = null;

/**
 * Geeft het id van de ingelogde gebruiker. Heeft dit apparaat nog geen sessie,
 * dan wordt er een anoniem account aangemaakt en worden oude session_id-gegevens
 * (opgeslagen items, foto's, Stripe-aankopen) eenmalig daaraan gekoppeld.
 * Returnt null als er geen verbinding is of anonieme logins uit staan.
 */
export function ensureUser(): Promise<string | null> {
  if (!pending) {
    pending = resolveUser().then((id) => {
      if (!id) pending = null; // volgende aanroep opnieuw proberen
      return id;
    });
  }
  return pending;
}

/**
 * Voor alleen-lezen: het id van een bestaande sessie, zonder op het web voor
 * elke bezoeker (en bot) een account aan te maken. In de app krijgt iedere
 * installatie wel direct een account.
 */
export async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;
  return IS_NATIVE_BUILD ? ensureUser() : null;
}

async function resolveUser(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  let userId = session?.user.id ?? null;

  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return null;
    userId = data.user.id;
  }

  await claimLegacySession();
  return userId;
}

async function claimLegacySession(): Promise<void> {
  try {
    if (localStorage.getItem(LEGACY_CLAIMED_KEY)) return;
    const { error } = await supabase.rpc("claim_legacy_session", {
      p_session_id: getOrCreateSessionId(),
    });
    if (!error) localStorage.setItem(LEGACY_CLAIMED_KEY, "1");
  } catch {
    // Volgende start opnieuw proberen
  }
}
