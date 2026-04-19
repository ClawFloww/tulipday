// Update alle bollenveld image_urls:
// - Voeg return_error_code=true toe aan Street View URLs (404 bij geen dekking)
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');

function getEnv(key) {
  const match = env.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : '';
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const MAPS_KEY = getEnv('NEXT_PUBLIC_GOOGLE_MAPS_KEY');

// Haal alle bollenvelden op
const res = await fetch(`${SUPABASE_URL}/rest/v1/locations?category=eq.flower_field&select=id,latitude,longitude&limit=500`, {
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  }
});

const locations = await res.json();
console.log(`${locations.length} bollenvelden gevonden`);

// Update in batches van 1 (PATCH per record met filter)
let updated = 0;
let errors = 0;

for (const loc of locations) {
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${loc.latitude},${loc.longitude}&fov=90&pitch=5&return_error_code=true&key=${MAPS_KEY}`;

  const r = await fetch(`${SUPABASE_URL}/rest/v1/locations?id=eq.${loc.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ image_url: streetViewUrl }),
  });

  if (r.ok) {
    updated++;
    if (updated % 25 === 0) console.log(`✓ ${updated}/${locations.length} bijgewerkt`);
  } else {
    errors++;
    console.error(`✗ Fout bij ${loc.id}:`, await r.text());
  }
}

console.log(`\nKlaar: ${updated} bijgewerkt, ${errors} fouten`);
