// Importeert 33 nieuwe routes uit GPX-bestanden naar Supabase.
// Gebruik: node scripts/import-new-routes.mjs [--live]
// Zonder --live: dry-run (toont plan, geen DB-wijzigingen)

import fs   from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID }   from "crypto";

const SUPABASE_URL     = "https://xjwdvqjswygkibyefnjj.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqd2R2cWpzd3lna2lieWVmbmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM2OTM4NCwiZXhwIjoyMDg5OTQ1Mzg0fQ.3vekm3W8K0LbIPl2mlJSD-L95s3C-dU6RWfkFO-vXXo";

const DRY_RUN = !process.argv.includes("--live");
const sb      = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BASE      = "/Users/clawfloww/Desktop/Nieuwe routes";
const EXCLUSIVE = `${BASE}/Tulip day Exclusive routes`;

// ─── Route-definitie ──────────────────────────────────────────────────────────

const ROUTES = [
  // ── Reguliere routes ──────────────────────────────────────────────────────
  { gpx: "Beach at Oosterduinse Meer – Tulip Fields Near Hillegom loop from Noordwijkerhout.gpx",
    dir: BASE, title: "Beach at Oosterduinse Meer", slug: "beach-oosterduinse-meer", type: "bike", featured: false },

  { gpx: "Bulb region.gpx",
    dir: BASE, title: "Bulb Region", slug: "bulb-region", type: "bike", featured: false },

  { gpx: "De Valk Windmill Museum – De Valk Mill loop from Noordwijk.gpx",
    dir: BASE, title: "De Valk Molen Route", slug: "de-valk-molen-route", type: "bike", featured: false },

  { gpx: "Duindamseslag – Avenue in De Blink loop from Leiden Centraal.gpx",
    dir: BASE, title: "Duindamseslag – De Blink", slug: "duindamseslag-de-blink", type: "bike", featured: false },

  { gpx: "Duindamseslag – Mountain Bike Trail Dunes loop from Noordwijk.gpx",
    dir: BASE, title: "MTB Duindamseslag Dunes", slug: "mtb-duindamseslag-dunes", type: "bike", featured: false },

  { gpx: "Duindamseslag – North Sea Coast Route Dune Trail loop from Noordwijk.gpx",
    dir: BASE, title: "Noord-Zee Kustroute Dune Trail", slug: "noordzee-kustroute-dune-trail", type: "bike", featured: false },

  { gpx: "Dune loop – cycling in Zandvoort kopie.gpx",
    dir: BASE, title: "Cycling in Zandvoort", slug: "cycling-in-zandvoort", type: "bike", featured: false },

  { gpx: "Dune loop – cycling in Zandvoort.gpx",
    dir: BASE, title: "Dune Loop Zandvoort", slug: "dune-loop-zandvoort", type: "bike", featured: false },

  { gpx: "Flower bulb route – cycling in Zandvoort.gpx",
    dir: BASE, title: "Flower Bulb Route Zandvoort", slug: "flower-bulb-route-zandvoort", type: "bike", featured: false },

  { gpx: "Huis te Manpad – Oude Beek Canal Path, Hillegom loop from Heemstede.gpx",
    dir: BASE, title: "Huis te Manpad – Oude Beek", slug: "huis-te-manpad-oude-beek", type: "bike", featured: false },

  { gpx: "Huis te Vogelenzang Estate – Tulip Fields Near Keukenhof loop from Bloemendaal.gpx",
    dir: BASE, title: "Huis te Vogelenzang Estate", slug: "huis-te-vogelenzang-estate", type: "bike", featured: false },

  { gpx: "Keukenhof – St. Agatha's Church, Lisse loop from Bennebroek.gpx",
    dir: BASE, title: "Keukenhof – St. Agatha Lisse", slug: "keukenhof-st-agatha-lisse", type: "bike", featured: false },

  { gpx: "Mountain Bike Trail Dunes – Mountain Trail Singletrack loop from Noordwijk.gpx",
    dir: BASE, title: "MTB Mountain Trail Singletrack", slug: "mtb-mountain-trail-singletrack", type: "bike", featured: false },

  { gpx: "Noordwijk Beach – Beautiful houses by the water loop from Noordwijk.gpx",
    dir: BASE, title: "Noordwijk Beach – Mooie Huizen", slug: "noordwijk-beach-mooie-huizen", type: "bike", featured: false },

  { gpx: "Noordwijk Beach – Queen Astrid Boulevard loop from Katwijk.gpx",
    dir: BASE, title: "Noordwijk – Koningin Astrid Boulevard", slug: "noordwijk-koningin-astrid-boulevard", type: "bike", featured: false },

  { gpx: "Noordwijk Dune Trail – Hollands Duin Cycle Path loop from Voorhout.gpx",
    dir: BASE, title: "Noordwijk Dune Trail", slug: "noordwijk-dune-trail", type: "bike", featured: false },

  { gpx: "Pannenduin – View of the Dunes loop from Voorhout.gpx",
    dir: BASE, title: "Pannenduin – Extreme Duinenroute", slug: "pannenduin-extreme-duinenroute", type: "bike", featured: false },

  { gpx: "The Tulperij – Tulip Display loop from Leiden Centraal.gpx",
    dir: BASE, title: "The Tulperij – Tulip Display", slug: "tulperij-tulip-display-leiden", type: "bike", featured: false },

  { gpx: "The Tulperij – Tulip Fields Near Sassenheim loop from Lisse.gpx",
    dir: BASE, title: "The Tulperij – Bollenvelden Lisse", slug: "tulperij-bollenvelden-lisse", type: "bike", featured: false },

  { gpx: "Tulip and Hyacinth Fields – Hoop Doet Leven Windmill loop from Voorhout.gpx",
    dir: BASE, title: "Tulpen & Hyacinten Route", slug: "tulpen-hyacinten-route", type: "bike", featured: false },

  { gpx: "Tulip Fields Near Hillegom – Tulip Fields Near Keukenhof loop from Noordwijkerhout.gpx",
    dir: BASE, title: "Bollenvelden Hillegom – Keukenhof", slug: "bollenvelden-hillegom-keukenhof", type: "bike", featured: false },

  { gpx: "Tulip Fields Near Keukenhof – Tulip Display loop from Katwijk.gpx",
    dir: BASE, title: "Keukenhof – Tulip Display Katwijk", slug: "keukenhof-tulip-display-katwijk", type: "bike", featured: false },

  { gpx: "Tulip Fields Near Keukenhof – Tulip Fields Near Hillegom loop from Lisse.gpx",
    dir: BASE, title: "Keukenhof – Bollenvelden Lisse", slug: "keukenhof-bollenvelden-lisse", type: "bike", featured: false },

  { gpx: "View of the Brederode Castle ruins – Ruins of Brederode Castle loop from Zandvoort aan Zee.gpx",
    dir: BASE, title: "Brederode Kasteel Route", slug: "brederode-kasteel-route", type: "bike", featured: false },

  { gpx: "View of the Dunes – Duindamseslag loop from Hillegom.gpx",
    dir: BASE, title: "Duinen & Duindamseslag", slug: "duinen-duindamseslag-hillegom", type: "bike", featured: false },

  { gpx: "Windmill – Keukenhof Tulip Fields loop from Lisse.gpx",
    dir: BASE, title: "Molen – Keukenhof Bollenvelden", slug: "molen-keukenhof-bollenvelden", type: "bike", featured: false },

  { gpx: "Zuiderduinpad Cycle Path – Hollands Duin Cycle Path loop from Bloemendaal.gpx",
    dir: BASE, title: "Zuiderduinpad Cycle Path", slug: "zuiderduinpad-cycle-path", type: "bike", featured: false },

  // ── Tulip Day Exclusive routes ────────────────────────────────────────────
  { gpx: "Duin, Bos & Tulpen rit (19.5km).gpx",
    dir: EXCLUSIVE, title: "Duin, Bos & Tulpen Rit", slug: "duin-bos-tulpen-rit", type: "bike", featured: true },

  { gpx: "Fietstocht door de bollenstreek (44.5km).gpx",
    dir: EXCLUSIVE, title: "Fietstocht door de Bollenstreek", slug: "fietstocht-door-de-bollenstreek", type: "bike", featured: true },

  { gpx: "From The White Church of Noordwijkerhout to Sint Bavo (19.9km).gpx",
    dir: EXCLUSIVE, title: "Van Witte Kerk naar Sint Bavo", slug: "witte-kerk-sint-bavo", type: "bike", featured: true },

  { gpx: "Ride to Keukenhof (22km).gpx",
    dir: EXCLUSIVE, title: "Ride to Keukenhof", slug: "ride-to-keukenhof", type: "bike", featured: true },

  { gpx: "Rondje door de streek (29.2km).gpx",
    dir: EXCLUSIVE, title: "Rondje door de Streek", slug: "rondje-door-de-streek", type: "bike", featured: true },

  { gpx: "Tripje rond de bollenstreek (53.1km).gpx",
    dir: EXCLUSIVE, title: "Tripje rond de Bollenstreek", slug: "tripje-rond-de-bollenstreek", type: "bike", featured: true },
];

// ─── GPX helpers ─────────────────────────────────────────────────────────────

function parseGPX(content) {
  const pts = [];
  const re  = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    pts.push([parseFloat(m[1]), parseFloat(m[2])]);
  }
  return pts;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R   = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a   = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalKm(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++)
    d += haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1]);
  return Math.round(d * 10) / 10;
}

function samplePoints(pts, n = 100) {
  if (pts.length <= n) return pts;
  const result = [];
  const step   = (pts.length - 1) / (n - 1);
  for (let i = 0; i < n; i++)
    result.push(pts[Math.round(i * step)]);
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN
    ? "=== DRY RUN (gebruik --live om echt in te voeren) ==="
    : "=== LIVE RUN ===\n");

  // Haal bestaande slugs op
  const { data: existing } = await sb.from("routes").select("slug");
  const existingSlugs      = new Set((existing ?? []).map(r => r.slug));

  const plan = [];
  const errors = [];

  for (const r of ROUTES) {
    const file = path.join(r.dir, r.gpx);
    if (!fs.existsSync(file)) { errors.push(`NIET GEVONDEN: ${r.gpx}`); continue; }

    const content = fs.readFileSync(file, "utf8");
    const pts     = parseGPX(content);
    if (pts.length < 2) { errors.push(`GEEN PUNTEN: ${r.gpx}`); continue; }

    const distKm   = totalKm(pts);
    const duration = Math.round(distKm / 15 * 60); // ~15 km/h gemiddeld
    const sampled  = samplePoints(pts, 100);
    const exists   = existingSlugs.has(r.slug);

    plan.push({ ...r, distKm, duration, sampled, exists });
  }

  // Plan tonen
  console.log("── Reguliere routes ──────────────────────────────────────────────────────");
  for (const p of plan.filter(p => !p.featured)) {
    const tag = p.exists ? "⚠️  AL AANWEZIG" : "➕ NIEUW";
    console.log(`${tag}  ${p.title.padEnd(42)} ${String(p.distKm).padStart(5)} km  ~${p.duration} min`);
  }

  console.log("\n── Tulip Day Exclusive routes ────────────────────────────────────────────");
  for (const p of plan.filter(p => p.featured)) {
    const tag = p.exists ? "⚠️  AL AANWEZIG" : "➕ NIEUW";
    console.log(`${tag}  ${p.title.padEnd(42)} ${String(p.distKm).padStart(5)} km  ~${p.duration} min`);
  }

  if (errors.length) {
    console.log("\n── Fouten ────────────────────────────────────────────────────────────────");
    errors.forEach(e => console.log("❌ " + e));
  }

  const toInsert = plan.filter(p => !p.exists);
  console.log(`\nTotaal: ${toInsert.length} nieuw, ${plan.filter(p => p.exists).length} al aanwezig`);

  if (DRY_RUN) { console.log("\n[Dry run klaar]"); return; }

  // Live invoegen
  let ok = 0, fail = 0;
  for (const p of toInsert) {
    const { error } = await sb.from("routes").insert({
      id:               randomUUID(),
      title:            p.title,
      slug:             p.slug,
      description:      null,
      route_type:       p.type,
      distance_km:      p.distKm,
      duration_minutes: p.duration,
      is_active:        true,
      is_featured:      p.featured,
      geometry_points:  p.sampled,
    });
    if (error) {
      console.log(`❌ ${p.title}: ${error.message}`);
      fail++;
    } else {
      console.log(`✅ ${p.title}`);
      ok++;
    }
  }
  console.log(`\n══ Klaar: ${ok} routes ingevoegd, ${fail} fouten ══`);
}

main().catch(e => { console.error(e); process.exit(1); });
