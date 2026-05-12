// Maakt 14 nieuwe locaties aan in Supabase en koppelt de bijbehorende foto's.
// Gebruik: node scripts/create-locations-with-photos.mjs [--dry-run] [--live]

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
const PHOTO_DIR        = "/Users/clawfloww/Desktop/Tom lokatie,s foto,s  2026";

const DRY_RUN = !process.argv.includes("--live");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── Locaties + foto-koppeling ─────────────────────────────────────────────────

const NEW_LOCATIONS = [
  {
    slug:     "t-zeepaardje",
    title:    "'t Zeepaardje",
    category: "food",
    address:  "De Grent 16-18, Noordwijk",
    latitude:  52.2427,
    longitude:  4.4343,
    photos:   ["'t Zeepaardje 1.JPG"],
  },
  {
    slug:     "beachclub-o",
    title:    "Beachclub O",
    category: "food",
    address:  "Koningin Wilhelmina Boulevard 106, Noordwijk",
    latitude:  52.2470,
    longitude:  4.4398,
    photos:   ["Beachclub O 1.JPG"],
  },
  {
    slug:     "boerhaave-voorhout",
    title:    "Boerhaave",
    category: "attraction",
    address:  "Herenstraat 57, Voorhout",
    latitude:  52.2227,
    longitude:  4.4851,
    photos:   ["Boerhave voorhout 1.JPG"],
  },
  {
    slug:     "boulevard-noordwijk",
    title:    "Boulevard Noordwijk",
    category: "photo_spot",
    address:  "Koningin Wilhelmina Boulevard, Noordwijk",
    latitude:  52.2443,
    longitude:  4.4367,
    photos:   ["Boulevard Noordwijk 1.JPG", "Beach 1.JPG", "Beach 2.JPG"],
  },
  {
    slug:     "have-fun-events",
    title:    "Have Fun Events",
    category: "attraction",
    address:  "Jacoba van Beierenweg 97A, Voorhout",
    latitude:  52.2323,
    longitude:  4.4984,
    photos:   ["Have fun events 1 .JPG"],
  },
  {
    slug:     "huis-ter-duin",
    title:    "Huis ter Duin",
    category: "food",
    address:  "Koningin Astrid Boulevard 5, Noordwijk",
    latitude:  52.2359,
    longitude:  4.4265,
    photos:   ["Huis ter duin 1.JPG"],
  },
  {
    slug:     "sint-bartholomeuskerk-voorhout",
    title:    "Sint-Bartholomeüskerk",
    category: "attraction",
    address:  "Herenstraat 47, Voorhout",
    latitude:  52.2230,
    longitude:  4.4859,
    photos:   ["Kerk voorhout 1.JPG"],
  },
  {
    slug:     "de-koele-costa",
    title:    "De Koele Costa",
    category: "food",
    address:  "Zeereep 21, Noordwijk",
    latitude:  52.2536,
    longitude:  4.4507,
    photos:   ["Koele Costa 1.JPG"],
  },
  {
    slug:     "kasteel-leeuwenhorst",
    title:    "Kasteel Leeuwenhorst",
    category: "attraction",
    address:  "Gooweg 36, Noordwijkerhout",
    latitude:  52.2458,
    longitude:  4.4754,
    photos:   ["Leeuwenhorst kasteel 1.JPG"],
  },
  {
    slug:     "reuzenrad-bella-vista",
    title:    "Reuzenrad Bella Vista",
    category: "attraction",
    address:  "Koningin Wilhelmina Boulevard 6D, Noordwijk",
    latitude:  52.2421,
    longitude:  4.4328,
    photos:   ["Reuzenrat noordwijk 1.JPG", "Reuzenrat noordwijk 2.JPG", "Reuzenrat noordwijk 3.JPG"],
  },
  {
    slug:     "van-kesteren-hotel",
    title:    "Van Kesteren",
    category: "food",
    address:  "Pickeplein 8, Noordwijk",
    latitude:  52.2415,
    longitude:  4.4357,
    photos:   ["Vam kesteren lisse 1.JPG", "Van kesteren 2.JPG"],
  },
  {
    slug:     "vuurtoren-noordwijk",
    title:    "Vuurtoren Noordwijk",
    category: "photo_spot",
    address:  "Koningin Wilhelmina Boulevard 34, Noordwijk",
    latitude:  52.2443,
    longitude:  4.4367,
    photos:   ["Vuurtoren noordwijk 1.JPG"],
  },
  {
    slug:     "witte-kerk-noordwijkerhout",
    title:    "Witte Kerk Noordwijkerhout",
    category: "photo_spot",
    address:  "Dorpsstraat 7, Noordwijkerhout",
    latitude:  52.2611,
    longitude:  4.4921,
    photos:   ["Witte kerk noordwijkerhout 1.JPG"],
  },
  {
    slug:     "hogeveense-molen",
    title:    "Hogeveense Molen",
    category: "photo_spot",
    address:  "Leidsevaart 81, Noordwijkerhout",
    latitude:  52.2443,
    longitude:  4.5037,
    photos:   ["molen leidschevaart.JPG"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: true });
  }
}

async function uploadFile(localPath, storagePath) {
  const buf  = fs.readFileSync(localPath);
  const mime = /\.jpe?g$/i.test(localPath) ? "image/jpeg" : "image/png";
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType: mime, upsert: true });
  if (error) throw new Error(error.message);
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN
    ? "=== DRY RUN (gebruik --live om echt uit te voeren) ==="
    : "=== LIVE RUN ===");

  // Controleer welke slugs al bestaan
  const { data: existing } = await sb.from("locations").select("slug");
  const existingSlugs = new Set(existing.map(l => l.slug));

  console.log("\n── Plan ──────────────────────────────────────────────────");
  for (const loc of NEW_LOCATIONS) {
    const exists = existingSlugs.has(loc.slug);
    const status = exists ? "⚠️  AL AANWEZIG" : "➕ NIEUW";
    console.log(`\n${status}  ${loc.title}  (${loc.slug})`);
    console.log(`    ${loc.category} · ${loc.address}`);
    console.log(`    ${loc.latitude}, ${loc.longitude}`);
    for (let i = 0; i < loc.photos.length; i++) {
      const photoPath = path.join(PHOTO_DIR, loc.photos[i]);
      const exists    = fs.existsSync(photoPath);
      const role      = i === 0 ? "HOOFDFOTO" : `extra foto ${i + 1}`;
      console.log(`    [${role}] ${loc.photos[i]} ${exists ? "✅" : "❌ NIET GEVONDEN"}`);
    }
  }

  if (DRY_RUN) { console.log("\n[Dry run klaar]"); return; }

  // Live uitvoeren
  await ensureBucket();
  let locOk = 0, photoOk = 0, fail = 0;

  for (const loc of NEW_LOCATIONS) {
    try {
      let locationId;

      if (existingSlugs.has(loc.slug)) {
        // Locatie bestaat al — haal ID op
        const { data } = await sb.from("locations").select("id").eq("slug", loc.slug).single();
        locationId = data.id;
        console.log(`\n⚠️  ${loc.title} bestaat al — foto's worden bijgewerkt`);
      } else {
        // Locatie aanmaken
        const { data, error } = await sb.from("locations").insert({
          slug:       loc.slug,
          title:      loc.title,
          category:   loc.category,
          address:    loc.address,
          latitude:   loc.latitude,
          longitude:  loc.longitude,
          is_active:  true,
          is_featured: false,
        }).select("id").single();
        if (error) throw error;
        locationId = data.id;
        locOk++;
        console.log(`\n✅  ${loc.title} aangemaakt`);
      }

      // Foto's uploaden en koppelen
      for (let i = 0; i < loc.photos.length; i++) {
        const photoFile  = loc.photos[i];
        const localPath  = path.join(PHOTO_DIR, photoFile);
        if (!fs.existsSync(localPath)) {
          console.log(`   ❌ Bestand niet gevonden: ${photoFile}`);
          fail++;
          continue;
        }

        const ext         = path.extname(photoFile).toLowerCase();
        const storagePath = `admin/${loc.slug}/${i + 1}${ext}`;
        process.stdout.write(`   Uploaden ${photoFile} … `);
        const url = await uploadFile(localPath, storagePath);

        if (i === 0) {
          // Hoofdfoto
          const { error } = await sb.from("locations")
            .update({ image_url: url }).eq("id", locationId);
          if (error) throw error;
          console.log("✅ hoofdfoto");
        } else {
          // Extra foto
          const { error } = await sb.from("location_photos").insert({
            location_id:     locationId,
            session_id:      "admin",
            storage_path:    storagePath,
            public_url:      url,
            status:          "approved",
            bloom_confirmed: false,
            approved_at:     new Date().toISOString(),
            approved_by:     "admin",
          });
          if (error) throw error;
          console.log(`✅ extra foto ${i + 1}`);
        }
        photoOk++;
      }
    } catch (e) {
      console.log(`\n❌ FOUT bij ${loc.title}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n══ Klaar: ${locOk} locaties aangemaakt, ${photoOk} foto's gekoppeld, ${fail} fouten ══`);
}

main().catch(e => { console.error(e); process.exit(1); });
