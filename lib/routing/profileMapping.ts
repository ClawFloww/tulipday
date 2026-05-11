// Vertaalt route-activiteitstype uit de DB naar het juiste BRouter-profiel.
// Activiteit-strings komen uit de `activity`-kolom in de routes-tabel.
//
// Waarom niet altijd 'trekking'?
//   • Wandelroutes (duinen, Atlantikwall, strandslagen) moeten hiking-mountain
//     gebruiken — trekking volgt fietspaden die voetgangers niet mogen gebruiken.
//   • Gewone fietsroutes: trekking (volgt LF-routes en fietspaden).
//   • Familieroutes op rustige wegen: safety (vermijdt drukke N-wegen).

import type { BRouterProfile } from "./brouter";

export function pickBRouterProfile(activity: string | null | undefined): BRouterProfile {
  const act = (activity ?? "").toLowerCase();

  if (act.includes("wandel") || act.includes("hiking") || act.includes("walk")) {
    return "hiking-mountain";
  }
  if (act.includes("mountainbike") || act.includes("mtb")) {
    return "trekking"; // BRouter heeft geen apart MTB-profiel publiek beschikbaar
  }
  if (act.includes("familie") || act.includes("family") || act.includes("e-step")) {
    return "safety";
  }
  if (act.includes("fiets") || act.includes("cycling") || act.includes("bike")) {
    return "trekking";
  }

  // Fallback: als route_type beschikbaar is, gebruik dat
  return "trekking";
}

/** Leesbaarder label per profiel voor logging */
export function profileLabel(profile: BRouterProfile): string {
  switch (profile) {
    case "hiking-mountain": return "Wandelen (duinen/natuur)";
    case "trekking":        return "Fietsen (fietspaden)";
    case "safety":          return "Fietsen (veilig/rustig)";
    case "shortest":        return "Kortste route";
  }
}
