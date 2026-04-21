// Routedatabank / Fietsplatform / Wandelnet integratie
// Officiële NL fiets- en wandelnetwerken (ODbL / CC BY 4.0)
//
// API-toegang aanvragen via:
//   Fietsplatform: https://www.fietsplatform.nl/routedatabank
//   Wandelnet:     https://www.wandelnet.nl
//
// Implementeer de functies hieronder na ontvangst van API-sleutel en documentatie.

const RDB_BASE = process.env.ROUTEDATABANK_API_URL;
const RDB_KEY  = process.env.ROUTEDATABANK_API_KEY;

export const ROUTEDATABANK_ATTRIBUTION = {
  source:      "routedatabank" as const,
  license:     "CC BY 4.0",
  attribution: "Routedata: Routedatabank / Fietsplatform / Wandelnet",
  sourceUrl:   "https://www.routedatabank.nl",
};

function isConfigured(): boolean {
  return Boolean(RDB_BASE && RDB_KEY);
}

/**
 * Haal een specifieke route op uit de Routedatabank op basis van ID.
 * Retourneert null als de API niet geconfigureerd is of de route niet gevonden wordt.
 */
export async function fetchRouteFromDatabank(
  routeId: string,
): Promise<object | null> {
  if (!isConfigured()) {
    console.warn("[Routedatabank] API niet geconfigureerd — sla over.");
    return null;
  }

  const res = await fetch(`${RDB_BASE}/routes/${routeId}/geojson`, {
    headers: { Authorization: `Bearer ${RDB_KEY}` },
  });

  if (!res.ok) return null;
  return res.json() as Promise<object>;
}

/**
 * Haal fietsknooppunten op voor de Bollenstreek.
 * Vereist Routedatabank API-toegang.
 */
export async function fetchKnooppuntenBollenstreek(): Promise<object | null> {
  if (!isConfigured()) return null;

  const res = await fetch(
    `${RDB_BASE}/networks/cycling/nodes?region=bollenstreek`,
    { headers: { Authorization: `Bearer ${RDB_KEY}` } },
  );

  if (!res.ok) return null;
  return res.json() as Promise<object>;
}
