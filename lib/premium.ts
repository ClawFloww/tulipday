export const FREE_LOCATION_LIMIT = 10;
export const FREE_ROUTE_LIMIT = 2;
export const PREMIUM_FEATURES = ["All locations", "All routes", "Bloom alerts", "Offline mode", "Exclusive routes"];

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tulipday_premium") === "true";
}
