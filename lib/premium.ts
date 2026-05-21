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

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tulipday_premium") === "true";
}
