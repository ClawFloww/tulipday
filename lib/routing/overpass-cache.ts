// 6-uurs in-memory cache — voorkomt herhaalde Overpass-calls per gebruiker
import {
  fetchFietsknooppunten,
  fetchWandelknooppunten,
  type OSMKnooppunt,
} from "./overpass-api";

const TTL = 1000 * 60 * 60 * 6; // 6 uur

type CacheEntry = { data: OSMKnooppunt[]; fetchedAt: number };
const cache: { fiets?: CacheEntry; wandel?: CacheEntry } = {};

export async function getCachedFietsknooppunten(): Promise<OSMKnooppunt[]> {
  if (cache.fiets && Date.now() - cache.fiets.fetchedAt < TTL) return cache.fiets.data;
  const data = await fetchFietsknooppunten();
  cache.fiets = { data, fetchedAt: Date.now() };
  return data;
}

export async function getCachedWandelknooppunten(): Promise<OSMKnooppunt[]> {
  if (cache.wandel && Date.now() - cache.wandel.fetchedAt < TTL) return cache.wandel.data;
  const data = await fetchWandelknooppunten();
  cache.wandel = { data, fetchedAt: Date.now() };
  return data;
}
