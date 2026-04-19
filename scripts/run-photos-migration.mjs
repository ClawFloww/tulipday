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

const sql = readFileSync(resolve(__dirname, '../supabase/migrations/20260412000001_location_photos.sql'), 'utf8');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  // Probeer via Supabase management API (pg endpoint)
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
  });
  console.log('Supabase status:', res2.status);
  console.error('exec_sql niet beschikbaar. Voer de SQL handmatig uit in het Supabase SQL-dashboard.');
  console.log('\nSQL om uit te voeren:\n');
  console.log(sql);
} else {
  console.log('✓ Migratie uitgevoerd');
}
