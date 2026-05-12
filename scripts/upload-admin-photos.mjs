// Script: koppel foto's uit de Desktop-map aan locaties in Supabase.
// Gebruik: node scripts/upload-admin-photos.mjs [--dry-run] [--live]
//
// Afbeelding 1 → locations.image_url (hoofdfoto)
// Afbeeldingen 2+ → location_photos (status = approved)

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(resolve(__dirname, "../.env.local"), "utf8");
function getEnv(key) {
  const m = envFile.match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) throw new Error(`Ontbrekende env var: ${key}`);
  return m[1].trim();
}

const SUPABASE_URL     = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET           = "location-photos";
const PHOTO_DIR        = "/Users/clawfloww/Documents/Tulipday alles/Alle Foto's/Tom lokatie,s foto,s  2026";

const DRY_RUN = !process.argv.includes("--live");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Bestandsnaam (lowercase) → echte slug in de database
const NAME_OVERRIDES = {
  "witzand":                       "strandclub-witsand",
  "cafe de rosser":                "cafe-de-rosser",
  "cafe restaurant de voogd":      "cafe-restaurant-de-voogd",
  "op dorp":                       "brasserie-op-dorp",
  "cheers":                        "cheers-voorhout",
  "como & co":                     "como-co",
  "de ruigenhoek":                 "de-ruigenhoek",
  "de vier seizoenen":             "restaurant-de-vier-seizoenen",
  "de voilaire":                   "de-voliere",
  "de heerekamer":                 "de-heerekamer-lisse",
  "dorpshart lisse - 't vierkant": "dorpshart-lisse-vierkant",
  "evi deli":                      "evi-deli",
  "het wapen van nhw":             "wapen-van-noordwijkerhout",
  "ijssalon min12":                "ijssalon-min12",
  "jub holland":                   "jub-holland",
  "langs berg en dal":             "langs-berg-en-dal",
  "lunchhuis ons thuis":           "lunchhuis-ons-thuis",
  "ons genoegen":                  "lunchroom-ons-genoegen",
  "op eigen wijze":                "op-eigen-wijze",
  "pannenkoe lisse":               "pannenkoekenboerderij-de-tulp",
  "papa ito":                      "papa-ito-fusion-gastrobar",
  "ruine van teylingen":           "ruine-van-teylingen",
  "tulum":                         "tulum",
  "welgelegen kitchen & drinks":   "welgelegen-kitchen-drinks",
  "'t soldaatje":                  "t-soldaatje",
  "alexander beachclub":           "alexander-beach-club",
  "barista cafe lisse":            "barista-cafe-lisse",
  "bij de duinen":                 "bij-de-duinen",
  "brownies & downies":            "brownies-downies-noordwijkerhout",
  // Niet (meer) aanwezig in de database — worden overgeslagen:
  // "'t zeepaardje", "beachclub o", "beach", "boerhave voorhout",
  // "boulevard noordwijk", "have fun events", "huis ter duin",
  // "kerk voorhout", "koele costa", "leeuwenhorst kasteel",
  // "molen leidschevaart", "reuzenrat noordwijk",
  // "vam kesteren lisse", "van kesteren", "vuurtoren noordwijk",
  // "witte kerk noordwijkerhout"
};

function slugify(s) {
  return s.toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFilename(filename) {
  const base = path.basename(filename, path.extname(filename)).trim();
  // "Witzand 2.JPG" → { name: "Witzand", num: 2 }
  // "Op dorp.JPG"   → { name: "Op dorp",  num: 1 }
  const m = base.match(/^(.+?)\s+(\d+)\s*$/);
  if (m) return { name: m[1].trim(), num: parseInt(m[2]) };
  return { name: base, num: 1 };
}

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: true });
    console.log(`Bucket '${BUCKET}' aangemaakt.`);
  }
}

async function uploadFile(localPath, storagePath) {
  const buf  = fs.readFileSync(localPath);
  const mime = /\.jpe?g$/i.test(localPath) ? "image/jpeg" : "image/png";
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType: mime, upsert: true });
  if (error) throw new Error(`Upload mislukt: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  console.log(DRY_RUN
    ? "=== DRY RUN — geen wijzigingen (gebruik --live om echt te uploaden) ==="
    : "=== LIVE RUN — foto's worden geupload en gekoppeld ===");

  // 1. Haal alle locaties op
  const { data: locations, error: locErr } = await sb
    .from("locations").select("id, title, slug");
  if (locErr) throw locErr;

  const bySlug  = Object.fromEntries(locations.map(l => [l.slug,            l]));
  const byTitle = Object.fromEntries(locations.map(l => [l.title.toLowerCase(), l]));

  function findLocation(name) {
    const key = name.toLowerCase().trim()
      // normaliseer speciale tekens
      .replace(/\u2013|\u2014/g, "-")  // em/en dash
      .replace(/['']/g, "'");

    // 1. Handmatige override (meest betrouwbaar)
    const overrideSlug = NAME_OVERRIDES[key];
    if (overrideSlug) return bySlug[overrideSlug] ?? null;

    // 2. Exacte titel match
    if (byTitle[key]) return byTitle[key];

    // 3. Slug match
    const slug = slugify(name);
    if (bySlug[slug]) return bySlug[slug];

    return null;
  }

  // 2. Lees en groepeer bestanden
  const files = fs.readdirSync(PHOTO_DIR)
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .sort();

  const groups = {};
  for (const f of files) {
    const { name, num } = parseFilename(f);
    const key = name.toLowerCase().trim();
    if (!groups[key]) groups[key] = { name, photos: [] };
    groups[key].photos.push({ file: f, num, localPath: path.join(PHOTO_DIR, f) });
  }
  for (const g of Object.values(groups)) {
    g.photos.sort((a, b) => a.num - b.num);
  }

  // 3. Match lokale groepen aan locaties
  const plan = [], unmatched = [];
  for (const g of Object.values(groups)) {
    const loc = findLocation(g.name);
    if (!loc) { unmatched.push(g); continue; }
    plan.push({ loc, photos: g.photos });
  }

  // 4. Rapporteer
  console.log("\n── Geplande koppeling ──────────────────────────────────");
  for (const { loc, photos } of plan) {
    console.log(`\n✅  ${loc.title}  (${loc.slug})`);
    for (const p of photos) {
      const role = p.num === 1
        ? "HOOFDFOTO → image_url"
        : `Extra foto ${p.num} → location_photos`;
      console.log(`    [${p.num}] ${p.file}  →  ${role}`);
    }
  }

  if (unmatched.length) {
    console.log("\n── Overgeslagen (locatie niet in database) ─────────────");
    for (const u of unmatched) {
      console.log(`❌  "${u.name}"  —  ${u.photos.map(p => p.file).join(", ")}`);
    }
  }

  console.log(`\nTotaal: ${plan.reduce((s, e) => s + e.photos.length, 0)} foto's te koppelen aan ${plan.length} locaties`);

  if (DRY_RUN) { console.log("\n[Dry run klaar]"); return; }

  // 5. Upload en sla op
  await ensureBucket();
  let ok = 0, fail = 0;

  for (const { loc, photos } of plan) {
    for (const p of photos) {
      try {
        const ext         = path.extname(p.file).toLowerCase();
        const storagePath = `admin/${loc.slug}/${p.num}${ext}`;
        process.stdout.write(`Uploaden ${p.file} … `);
        const url = await uploadFile(p.localPath, storagePath);

        if (p.num === 1) {
          const { error } = await sb.from("locations")
            .update({ image_url: url }).eq("id", loc.id);
          if (error) throw error;
          console.log(`✅ hoofdfoto`);
        } else {
          const { data: existing } = await sb.from("location_photos")
            .select("id").eq("storage_path", storagePath).maybeSingle();
          if (existing) {
            console.log(`⏭  extra foto ${p.num} (bestond al)`);
          } else {
            const { error } = await sb.from("location_photos").insert({
              location_id:     loc.id,
              session_id:      "admin",
              storage_path:    storagePath,
              public_url:      url,
              status:          "approved",
              bloom_confirmed: false,
              approved_at:     new Date().toISOString(),
              approved_by:     "admin",
            });
            if (error) throw error;
            console.log(`✅ extra foto ${p.num}`);
          }
        }
        ok++;
      } catch (e) {
        console.log(`❌ FOUT: ${e.message}`);
        fail++;
      }
    }
  }

  console.log(`\n══ Klaar: ${ok} succesvol, ${fail} mislukt ══`);
}

main().catch(e => { console.error(e); process.exit(1); });
