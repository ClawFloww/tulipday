const CACHE_KEY = "tulipday_geolocation";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuten

interface CachedCoords {
  lat: number;
  lng: number;
  timestamp: number;
}

export function getCachedCoords(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedCoords = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return { lat: cached.lat, lng: cached.lng };
  } catch {
    return null;
  }
}

export function setCachedCoords(lat: number, lng: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }));
  } catch {}
}
