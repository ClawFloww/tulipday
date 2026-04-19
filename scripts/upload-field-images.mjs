/**
 * Upload lokale bollenveld-foto's naar Supabase Storage
 * en koppel ze aan locaties via image_url.
 *
 * Verdelingslogica:
 * - Foto met exact hetzelfde nummer als locatie → directe koppeling
 * - Meer foto's dan locaties op een straat → verdeeld op basis van naastgelegen nummer
 * - Minder foto's dan locaties → eerste N locaties krijgen een foto
 */

import { readFileSync, readdirSync, createReadStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`${k}=(.+)`)); return m?.[1]?.trim() ?? ''; };

const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const PHOTOS_DIR = "/Users/clawfloww/Documents/Tulipday app foto's 3";
const BUCKET = 'location-images';

// ── Straatnaam-correcties (afbeelding → database slug-prefix) ────────────────
// Sleutel: genormaliseerde naam uit bestandsnaam
// Waarde: slug-prefix in de database
const STREET_MAP = {
  'frank van boselenlaan':            'frank-van-borselenlaan',
  'heereweg':                         'heereweg-lis',
  's gravendamse weg':                'sgravendamseweg',
  'zilkerbinneweg':                   'zilkerbinnenweg',
  'wilhelminalaan':                   'wilheminalaan',
  'loosterweg zuidcode':              'loosterweg-zuidcode', // fallback
  'beeklaan nw':                      'herenweg-nw',
  'van den berch van heemstedeweg':   'van-den-berch-van-heemstedeweg',
  'jacoba van beierenweg':            'jacoba-van-beierenweg',
  'leidsevaart voorhout':             null, // niet in DB
  'europarks':                        null,
  'smelterij':                        null,
  'tulip experiance':                 null,
  'overig':                           null,
};

// ── Hulpfuncties ─────────────────────────────────────────────────────────────

function slugify(s) {
  return s.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parseer bestandsnaam naar { street, number }
 * Voorbeelden:
 *   "Frank van boselenlaan 3.jpg" → { street: "frank van boselenlaan", number: 3 }
 *   "Loosterweg noord 16.jpg"     → { street: "loosterweg noord", number: 16 }
 *   "'s Gravendamse weg.jpg"      → { street: "s gravendamse weg", number: 0 }
 *   "Beeklaan NW.jpg"             → { street: "beeklaan nw", number: 0 }
 *   "Leidsevaart 2 voorhout.jpg"  → { street: "leidsevaart voorhout", number: 2 }
 */
function parseImageName(filename) {
  let name = filename.replace(/\.jpg$/i, '').trim();
  // Verwijder backtick (bijv. "Schippersvaartweg `")
  name = name.replace(/[`]/g, '').trim();
  // Verwijder leading ' of s van 's
  name = name.replace(/^'s\s+/i, 's ');

  // Speciale patronen: "Straat N voorhout" → treat "voorhout" als suffix, not part of street
  const voorhoutMatch = name.match(/^(.+?)\s+(\d+)\s+voorhout$/i);
  if (voorhoutMatch) {
    return { street: voorhoutMatch[1].toLowerCase().trim() + ' voorhout', number: parseInt(voorhoutMatch[2]) };
  }

  // Normaal patroon: "Straatnaam N" of "Straatnaam NW" of "Straatnaam"
  const numMatch = name.match(/^(.*?)\s+(\d+)\s*$/);
  if (numMatch) {
    return { street: numMatch[1].toLowerCase().trim(), number: parseInt(numMatch[2]) };
  }

  // Suffix NW (Noordwijkerhout)
  const nwMatch = name.match(/^(.*?)\s+(NW)\s*$/i);
  if (nwMatch) {
    return { street: (nwMatch[1] + ' nw').toLowerCase().trim(), number: 0 };
  }

  // Geen getal: bijv. "Zwarteweg", "Boekhorsterweg"
  return { street: name.toLowerCase().trim(), number: 0 };
}

/**
 * Zet straatnaam om naar DB slug-prefix
 */
function streetToSlugPrefix(street) {
  if (STREET_MAP.hasOwnProperty(street)) return STREET_MAP[street];
  return slugify(street);
}

/**
 * Extraheer het trailing getal uit een slug ("loosterweg-noord-4" → 4)
 */
function slugNumber(slug) {
  const m = slug.match(/-(\d+)$/);
  return m ? parseInt(m[1]) : 0;
}

/**
 * Vind de locatie met het dichtstbijzijnde nummer
 */
function closestLocation(locations, targetNumber) {
  return locations.reduce((best, loc) => {
    const diff = Math.abs(slugNumber(loc.slug) - targetNumber);
    const bestDiff = Math.abs(slugNumber(best.slug) - targetNumber);
    return diff < bestDiff ? loc : best;
  });
}

// ── Stap 1: Maak bucket aan als die nog niet bestaat ─────────────────────────
async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`✓ Bucket '${BUCKET}' aangemaakt`);
  } else {
    console.log(`✓ Bucket '${BUCKET}' bestaat al`);
  }
}

// ── Stap 2: Haal alle locaties op ────────────────────────────────────────────
async function fetchLocations() {
  const { data, error } = await sb
    .from('locations')
    .select('id, slug, title')
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

// ── Stap 3: Groepeer foto's per straat-prefix ─────────────────────────────────
function groupImages(files) {
  const groups = new Map(); // slugPrefix → [{filename, number}]
  const skipped = [];

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.jpg')) continue;
    const { street, number } = parseImageName(file);
    const prefix = streetToSlugPrefix(street);

    if (prefix === null) { skipped.push(file); continue; }
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push({ filename: file, number });
  }

  return { groups, skipped };
}

// ── Stap 4: Koppel foto's aan locaties ───────────────────────────────────────
function assignImages(groups, locations) {
  // Index: slug-prefix → [locaties]
  const locByPrefix = new Map();
  for (const loc of locations) {
    // Bepaal prefix: slug zonder trailing "-N"
    const prefix = loc.slug.replace(/-\d+$/, '');
    if (!locByPrefix.has(prefix)) locByPrefix.set(prefix, []);
    locByPrefix.get(prefix).push(loc);
  }

  const assignments = new Map(); // locationId → filename
  const unmatched = [];

  for (const [imgPrefix, images] of groups) {
    // Zoek locaties die matchen
    let locs = locByPrefix.get(imgPrefix) ?? [];

    // Fallback: ook proberen met slug van de prefix zelf (voor single locaties)
    if (locs.length === 0) {
      const direct = locations.find(l => l.slug === imgPrefix);
      if (direct) locs = [direct];
    }

    if (locs.length === 0) {
      images.forEach(img => unmatched.push(`${imgPrefix}: ${img.filename}`));
      continue;
    }

    // Sorteer locaties en foto's op nummer
    const sortedLocs = [...locs].sort((a, b) => slugNumber(a.slug) - slugNumber(b.slug));
    const sortedImgs = [...images].sort((a, b) => a.number - b.number);

    if (sortedImgs.length >= sortedLocs.length) {
      // Meer (of gelijk) foto's dan locaties: elk krijgt naastgelegen foto
      for (const loc of sortedLocs) {
        const target = slugNumber(loc.slug) || 1;
        const img = closestLocation(
          sortedImgs.map(i => ({ slug: `x-${i.number}`, filename: i.filename })),
          target
        );
        assignments.set(loc.id, img.filename);
      }
    } else {
      // Minder foto's dan locaties: verdeel op positie
      for (let i = 0; i < sortedImgs.length; i++) {
        const locIdx = Math.round(i * (sortedLocs.length - 1) / Math.max(sortedImgs.length - 1, 1));
        const loc = sortedLocs[Math.min(locIdx, sortedLocs.length - 1)];
        assignments.set(loc.id, sortedImgs[i].filename);
      }
    }
  }

  return { assignments, unmatched };
}

// ── Stap 5: Upload foto's en update DB ────────────────────────────────────────
async function uploadAndUpdate(assignments) {
  const entries = [...assignments.entries()];
  let uploaded = 0;
  let errors = 0;

  console.log(`\nUploaden van ${entries.length} foto's…`);

  // Upload in batches van 5 parallel
  const BATCH = 5;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(batch.map(async ([locationId, filename]) => {
      const filepath = resolve(PHOTOS_DIR, filename);
      const storagePath = `fields/${locationId}.jpg`;

      try {
        // Lees bestand
        const fileData = readFileSync(filepath);

        // Upload (overschrijven als al bestaat)
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(storagePath, fileData, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (upErr) throw upErr;

        // Haal publieke URL op
        const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(storagePath);

        // Update image_url in DB
        const { error: dbErr } = await sb
          .from('locations')
          .update({ image_url: publicUrl })
          .eq('id', locationId);
        if (dbErr) throw dbErr;

        uploaded++;
        if (uploaded % 10 === 0 || uploaded === entries.length) {
          process.stdout.write(`\r  ✓ ${uploaded}/${entries.length} verwerkt`);
        }
      } catch (err) {
        errors++;
        console.error(`\n  ✗ Fout bij "${filename}": ${err.message}`);
      }
    }));
  }

  console.log(`\n\nKlaar: ${uploaded} foto's gekoppeld, ${errors} fouten`);
}

// ── Hoofdprogramma ────────────────────────────────────────────────────────────
const files = readdirSync(PHOTOS_DIR);
console.log(`📁 ${files.length} bestanden gevonden`);

await ensureBucket();

const locations = await fetchLocations();
console.log(`📍 ${locations.length} locaties opgehaald`);

const { groups, skipped } = groupImages(files);
console.log(`🗂  ${groups.size} straten herkend, ${skipped.length} overgeslagen`);
if (skipped.length > 0) console.log('   Overgeslagen:', skipped.join(', '));

const { assignments, unmatched } = assignImages(groups, locations);
console.log(`🔗 ${assignments.size} koppelingen gemaakt`);
if (unmatched.length > 0) {
  console.log('   Geen DB-match gevonden voor:');
  unmatched.forEach(u => console.log('   -', u));
}

await uploadAndUpdate(assignments);
