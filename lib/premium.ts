import { currentUserId, ensureUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const FREE_LOCATION_LIMIT = 10;
export const FREE_ROUTE_LIMIT = 2;
export const PREMIUM_FEATURES = ["All locations", "All routes", "Bloom alerts", "Offline mode", "Exclusive routes"];

// ─── Prijzen & jaartal ──────────────────────────────────────────────────────
// Centraal beheer: bij seizoenswissel volstaat het deze sectie aan te passen —
// alle UI-componenten en i18n-bodies leiden hun copy uit deze constanten af.
export const CURRENT_SEASON_YEAR   = 2026;
export const CURRENT_SEASON_PRICE  = 4.99;
export const EARLY_BIRD_YEAR       = 2027;
export const EARLY_BIRD_PRICE      = 2.99;
export const EARLY_BIRD_FROM_MONTH = "februari"; // NL referentiemaand; wordt aan t() doorgegeven

/** Formatteer euro-bedrag in NL-stijl (komma als decimaal scheidingsteken). */
export function formatPriceEur(amount: number): string {
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

// ─── Premium-status ─────────────────────────────────────────────────────────
// De bron van waarheid is de tabel `entitlements` (alleen schrijfbaar door de
// server). Lokaal bewaren we het seizoen als cache, zodat de UI direct en
// offline klopt; refreshPremium() werkt die cache bij.

const PREMIUM_CACHE_KEY = "tulipday_premium_season";

/** Laatst bekende status (cache) — direct beschikbaar, ook offline. */
export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREMIUM_CACHE_KEY) === String(CURRENT_SEASON_YEAR);
}

/** Haal de actuele status op bij de server en werk de cache bij. */
export async function refreshPremium(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // Wie nog de oude lokale vlag heeft, krijgt een account zodat een eerdere
  // Stripe-aankoop via claim_legacy_session kan meeverhuizen
  const hasLegacyFlag = localStorage.getItem("tulipday_premium") === "true";
  const userId = hasLegacyFlag ? await ensureUser() : await currentUserId();
  if (!userId) return isPremium(); // geen account of offline: houd de cache aan

  const { data, error } = await supabase
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("season", CURRENT_SEASON_YEAR)
    .is("revoked_at", null)
    .limit(1);
  if (error) return isPremium();

  const active = (data ?? []).length > 0;
  if (active) localStorage.setItem(PREMIUM_CACHE_KEY, String(CURRENT_SEASON_YEAR));
  else localStorage.removeItem(PREMIUM_CACHE_KEY);
  localStorage.removeItem("tulipday_premium"); // oude, onbeveiligde vlag
  return active;
}
