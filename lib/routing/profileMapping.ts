// Vertaalt route-activiteitstype uit de DB naar het juiste BRouter-profiel.
// Activiteit-strings komen uit de `activity`-kolom in de routes-tabel.
//
// Profielkeuze per activiteit:
//   • Wandelroutes (duinen, Atlantikwall, strandslagen): hiking-mountain —
//     mag voetpaden en natuurpaden volgen.
//   • MTB-routes: trekking — BRouter heeft geen publiek MTB-profiel,
//     trekking volgt karrenpaden/fietspaden die MTB'ers willen.
//   • Reguliere fiets- en familieroutes: safety — vermijdt drukke N-wegen
//     én ongepaste karrenpaden/veldpaden. Voor toeristische Bollenstreek-
//     routes is dit veruit het beste profiel (eerder gebruikten we
//     trekking, maar dat koos soms onverharde veldwegen als kortere route).

import type { BRouterProfile } from "./brouter";

export function pickBRouterProfile(activity: string | null | undefined): BRouterProfile {
  const act = (activity ?? "").toLowerCase();

  if (act.includes("wandel") || act.includes("hiking") || act.includes("walk")) {
    return "hiking-mountain";
  }
  if (act.includes("mountainbike") || act.includes("mtb")) {
    return "trekking";
  }
  if (
    act.includes("familie") || act.includes("family") || act.includes("e-step") ||
    act.includes("fiets")   || act.includes("cycling") || act.includes("bike")
  ) {
    return "safety";
  }

  // Fallback voor onbekende activiteiten: safety geeft de minste verrassingen
  return "safety";
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
