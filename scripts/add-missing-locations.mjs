import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`${k}=(.+)`)); return m?.[1]?.trim() ?? ''; };

const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const PHOTOS_DIR = "/Users/clawfloww/Documents/Tulipday app foto's 3";
const BUCKET = 'location-images';

// ── DMS → decimaal ────────────────────────────────────────────────────────────
function dms(d, m, s, dir) {
  const dec = d + m / 60 + s / 3600;
  return (dir === 'S' || dir === 'W') ? -dec : dec;
}

// ── Nieuwe locaties ────────────────────────────────────────────────────────────
const NEW_LOCATIONS = [
  {
    slug:              'europarks',
    title:             'Europarks',
    category:          'flower_field',
    latitude:          dms(52, 17, 12.8, 'N'),
    longitude:         dms(4,  29, 22.1, 'E'),
    address:           'Europarks, Noordwijkerhout',
    short_description: 'Bollenvelden bij recreatiegebied Europarks in Noordwijkerhout.',
    full_description:  'Kleurrijke bollenvelden langs het recreatiegebied Europarks. Goed bereikbaar en ideaal voor een combinatie van natuur en recreatie.',
    flower_type:       'tulip',
    bloom_status:      'blooming',
    photo_score:       4,
    crowd_score:       3,
    access_type:       'roadside_only',
    parking_info:      'Parkeren mogelijk bij Europarks.',
    best_visit_time:   'Vroeg in de ochtend of golden hour.',
    is_featured:       false,
    is_active:         true,
    imageFile:         'Europarks 1.jpg',
  },
  {
    slug:              'smelterij',
    title:             'Smelterij',
    category:          'flower_field',
    latitude:          dms(52, 14, 58.9, 'N'),
    longitude:         dms(4,  29, 51.1, 'E'),
    address:           'Smelterij, Noordwijkerhout',
    short_description: 'Bollenveld bij de Smelterij in de Bollenstreek.',
    full_description:  'Een prachtig bollenveld nabij de Smelterij. Goed bereikbaar langs de weg, ideaal voor een fietstocht of autorit.',
    flower_type:       'tulip',
    bloom_status:      'blooming',
    photo_score:       4,
    crowd_score:       4,
    access_type:       'roadside_only',
    parking_info:      'Beperkt parkeren langs de kant van de weg.',
    best_visit_time:   'Vroeg in de ochtend of golden hour voor de mooiste foto\'s.',
    is_featured:       false,
    is_active:         true,
    imageFile:         'Smelterij 1.jpg',
  },
  {
    slug:              'leidsevaart-voorhout-1',
    title:             'Leidsevaart Voorhout 1',
    category:          'flower_field',
    latitude:          dms(52, 13, 28.6, 'N'),
    longitude:         dms(4,  28, 14.3, 'E'),
    address:           'Leidsevaart, Voorhout',
    short_description: 'Bollenveld langs de Leidsevaart bij Voorhout.',
    full_description:  'Prachtige bollenvelden langs de Leidsevaart aan de kant van Voorhout. Minder druk dan de Lisse-kant, ideaal voor rustige fotosessies.',
    flower_type:       'tulip',
    bloom_status:      'blooming',
    photo_score:       4,
    crowd_score:       3,
    access_type:       'roadside_only',
    parking_info:      'Beperkt parkeren langs de kant van de weg. Fiets aanbevolen.',
    best_visit_time:   'Vroeg in de ochtend of golden hour voor de mooiste foto\'s.',
    is_featured:       false,
    is_active:         true,
    imageFile:         'Leidsevaart 1 voorhout.jpg',
  },
  {
    slug:              'leidsevaart-voorhout-2',
    title:             'Leidsevaart Voorhout 2',
    category:          'flower_field',
    latitude:          dms(52, 13, 25.5, 'N'),
    longitude:         dms(4,  28, 24.3, 'E'),
    address:           'Leidsevaart, Voorhout',
    short_description: 'Bollenveld langs de Leidsevaart bij Voorhout.',
    full_description:  'Tweede bollenveldspot langs de Leidsevaart bij Voorhout. Op loopafstand van de eerste locatie, met een ander perspectief op de velden.',
    flower_type:       'tulip',
    bloom_status:      'blooming',
    photo_score:       4,
    crowd_score:       3,
    access_type:       'roadside_only',
    parking_info:      'Beperkt parkeren langs de kant van de weg. Fiets aanbevolen.',
    best_visit_time:   'Vroeg in de ochtend of golden hour voor de mooiste foto\'s.',
    is_featured:       false,
    is_active:         true,
    imageFile:         'Leidsevaart 2 voorhout.jpg',
  },
];

// ── Hulp: upload één foto ─────────────────────────────────────────────────────
async function uploadImage(locationId, filename) {
  const filepath = resolve(PHOTOS_DIR, filename);
  const fileData = readFileSync(filepath);
  const storagePath = `fields/${locationId}.jpg`;

  const { error } = await sb.storage.from(BUCKET).upload(storagePath, fileData, {
    contentType: 'image/jpeg', upsert: true,
  });
  if (error) throw error;

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

// ── Stap 1: Maak nieuwe locaties aan ──────────────────────────────────────────
console.log('Nieuwe locaties aanmaken…');
for (const loc of NEW_LOCATIONS) {
  const { imageFile, ...locData } = loc;

  const { data: existing } = await sb.from('locations').select('id').eq('slug', locData.slug).maybeSingle();
  if (existing) { console.log(`  ↷ ${locData.slug} bestaat al (id: ${existing.id})`); loc._id = existing.id; continue; }

  const { data, error } = await sb.from('locations').insert(locData).select('id').single();
  if (error) { console.error(`  ✗ Fout bij ${locData.slug}:`, error.message); continue; }
  loc._id = data.id;
  console.log(`  ✓ ${locData.slug} aangemaakt`);
}

// ── Stap 2: Upload foto's voor nieuwe locaties ────────────────────────────────
console.log('\nFoto\'s uploaden voor nieuwe locaties…');
for (const loc of NEW_LOCATIONS) {
  if (!loc._id) continue;
  try {
    const url = await uploadImage(loc._id, loc.imageFile);
    await sb.from('locations').update({ image_url: url }).eq('id', loc._id);
    console.log(`  ✓ ${loc.imageFile} → ${loc.slug}`);
  } catch (err) {
    console.error(`  ✗ Fout bij ${loc.imageFile}:`, err.message);
  }
}

// ── Stap 3: Verspreid "overig" foto's ─────────────────────────────────────────
console.log('\nOverig foto\'s verspreiden…');

const overigFiles = readdirSync(PHOTOS_DIR)
  .filter(f => f.toLowerCase().startsWith('overig') && f.toLowerCase().endsWith('.jpg'))
  .sort();

console.log(`  ${overigFiles.length} overig-foto's gevonden: ${overigFiles.join(', ')}`);

// Vind locaties die nog een Street View URL hebben (geen echte foto)
const { data: svLocations } = await sb
  .from('locations')
  .select('id, slug')
  .like('image_url', '%maps.googleapis.com%')
  .eq('is_active', true)
  .order('slug');

console.log(`  ${svLocations.length} locaties hebben nog een Street View foto`);

// Kies willekeurig N locaties (gelijkmatig verspreid over de lijst)
const step = Math.floor(svLocations.length / overigFiles.length);
const chosen = overigFiles.map((_, i) => svLocations[i * step]);

console.log(`  Verdeeld over ${chosen.length} locaties:`);
for (let i = 0; i < overigFiles.length; i++) {
  const loc = chosen[i];
  if (!loc) continue;
  try {
    const url = await uploadImage(loc.id, overigFiles[i]);
    await sb.from('locations').update({ image_url: url }).eq('id', loc.id);
    console.log(`  ✓ ${overigFiles[i]} → ${loc.slug}`);
  } catch (err) {
    console.error(`  ✗ Fout bij ${overigFiles[i]}:`, err.message);
  }
}

console.log('\nKlaar!');
