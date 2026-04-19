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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missende NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function dmsToDecimal(dms) {
  const match = dms.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])/);
  if (!match) throw new Error(`Kan niet parsen: ${dms}`);
  const [, deg, min, sec, dir] = match;
  let decimal = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
  if (dir === 'S' || dir === 'W') decimal = -decimal;
  return parseFloat(decimal.toFixed(7));
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function toTitleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const raw = `52°13'44.6"N 4°30'44.7"E
frank van borselenlaan 5

52°13'45.5"N 4°30'35.8"E
frank van borselenlaan 4

52°13'35.9"N 4°30'24.7"E
van den berch van heemstedeweg 2

52°13'56.9"N 4°30'54.3"E
frank van borselenlaan 1

52°13'51.6"N 4°30'47.7"E
frank van borselenlaan 2

52°13'47.8"N 4°30'40.6"E
frank van borselenlaan 3

52°13'44.9"N 4°30'10.9"E
van den berch van heemstedeweg 1

52°13'51.7"N 4°30'07.2"E
prinsenweg 4

52°13'55.2"N 4°30'13.4"E
prinsenweg 3

52°14'02.7"N 4°30'24.0"E
prinsenweg 2

52°14'08.6"N 4°30'34.9"E
prinsenweg 1

52°13'24.5"N 4°30'03.0"E
teylingerdreef 2

52°13'32.7"N 4°30'18.8"E
eikenhorstlaan 1

52°13'37.4"N 4°30'02.7"E
teylingerdreef 1

52°13'56.7"N 4°29'47.6"E
Jacoba van Beierenweg 3

52°14'01.2"N 4°29'57.7"E
Jacoba van Beierenweg 2

52°14'12.0"N 4°30'14.5"E
Jacoba van Beierenweg 1

52°16'54.7"N 4°34'21.5"E
leidsestraat 3

52°16'47.6"N 4°34'18.4"E
leidsestraat 2

52°16'25.9"N 4°34'05.9"E
leidsestraat 1

52°16'10.7"N 4°33'35.7"E
heereweg lis 8

52°16'25.7"N 4°33'41.8"E
zwartelaan 2

52°16'32.8"N 4°33'23.7"E
zwartelaan 1

52°17'18.3"N 4°34'26.3"E
veenenburgerlaan 5

52°17'18.8"N 4°34'06.9"E
veenenburgerlaan 4

52°17'14.5"N 4°33'44.8"E
veenenburgerlaan 3

52°17'10.4"N 4°33'32.4"E
veenenburgerlaan 2

52°17'06.8"N 4°33'27.4"E
veenenburgerlaan 1

52°16'55.3"N 4°33'13.9"E
loosterweg noord 4

52°16'47.6"N 4°33'08.1"E
loosterweg noord 3

52°16'38.1"N 4°32'58.2"E
loosterweg noord 2

52°16'30.0"N 4°32'49.7"E
loosterweg noord 1

52°17'17.4"N 4°33'52.0"E
3e loosterweg 3

52°17'29.4"N 4°33'42.3"E
3e loosterweg 2

52°17'37.4"N 4°33'45.4"E
3e loosterweg 1

52°17'44.3"N 4°33'58.7"E
wilheminalaan 1

52°17'49.2"N 4°33'26.0"E
beeklaan 2

52°17'46.3"N 4°33'36.1"E
beeklaan 1

52°17'37.4"N 4°33'02.1"E
zuider leidsevaart 4

52°17'21.5"N 4°32'48.0"E
zuider leidsevaart 3

52°17'06.7"N 4°32'35.2"E
zuider leidsevaart 2

52°16'49.1"N 4°32'19.6"E
zuider leidsevaart 1

52°16'50.6"N 4°32'04.0"E
delfweg 2

52°17'00.8"N 4°31'58.2"E
delfweg 1

52°18'11.9"N 4°34'44.7"E
pastoorslaan 3

52°18'17.8"N 4°34'26.3"E
pastoorslaan 2

52°18'23.5"N 4°34'12.8"E
pastoorslaan 1

52°18'25.5"N 4°34'10.1"E
1e loosterweg 2

52°18'36.7"N 4°34'17.4"E
1e loosterweg 1

52°18'49.4"N 4°34'49.8"E
nieuweweg 2

52°18'48.7"N 4°34'33.5"E
nieuweweg 1

52°18'44.5"N 4°33'59.3"E
noorder leidsevaart 4

52°19'06.5"N 4°33'56.5"E
2e doodweg 2

52°19'00.6"N 4°33'51.8"E
2e doodweg 1

52°18'57.1"N 4°34'26.9"E
provincialeweg 4

52°18'50.0"N 4°34'01.4"E
provincialeweg 3

52°18'47.6"N 4°33'36.2"E
provincialeweg 2

52°18'43.2"N 4°33'12.0"E
provincialeweg 1

52°18'26.8"N 4°33'44.7"E
noorder leidsevaart 3

52°18'13.8"N 4°33'34.1"E
noorder leidsevaart 2

52°18'01.4"N 4°33'23.9"E
noorder leidsevaart 1

52°17'53.9"N 4°33'09.5"E
hoogduinweg 3

52°17'58.8"N 4°32'52.2"E
hoogduinweg 2

52°18'04.5"N 4°32'26.6"E
hoogduinweg 1

52°17'56.8"N 4°32'32.7"E
zilkerbinnenweg 5

52°17'50.3"N 4°32'29.9"E
zilkerbinnenweg 4

52°17'34.3"N 4°32'10.4"E
zilkerbinnenweg 3

52°17'24.3"N 4°32'04.0"E
zilkerbinnenweg 2

52°17'16.6"N 4°31'58.3"E
zilkerbinnenweg 1

52°14'28.7"N 4°31'36.0"E
oude herenweg 5

52°14'25.1"N 4°31'31.8"E
oude herenweg 4

52°14'17.5"N 4°31'22.5"E
oude herenweg 3

52°14'13.1"N 4°31'16.2"E
oude herenweg 2

52°14'08.2"N 4°31'09.1"E
oude herenweg 1

52°14'15.2"N 4°30'38.8"E
teylingenlaan 3

52°14'09.7"N 4°30'49.2"E
teylingenlaan 2

52°14'02.7"N 4°31'02.3"E
teylingerlaan 1

52°13'55.7"N 4°31'29.7"E
carolus clusiuslaan 1

52°14'04.0"N 4°31'56.0"E
heereweg lis 7

52°14'12.8"N 4°32'04.4"E
heereweg lis 6

52°14'19.1"N 4°32'09.3"E
heereweg lis 5

52°14'25.5"N 4°32'14.6"E
heereweg lis 4

52°14'44.8"N 4°32'30.6"E
heereweg lis 3

52°14'57.6"N 4°32'40.9"E
heereweg lis 2

52°15'05.6"N 4°32'46.4"E
heereweg lis 1

52°15'18.2"N 4°32'49.6"E
westelijke randweg 2

52°15'39.7"N 4°32'56.9"E
westelijke randweg 1

52°15'54.2"N 4°32'55.2"E
stationsweg 1

52°15'53.4"N 4°32'47.4"E
van lyndenweg 2

52°15'42.3"N 4°32'38.1"E
van lyndenweg 1

52°15'35.7"N 4°32'16.6"E
spekkenlaan 2

52°15'36.2"N 4°32'05.2"E
spekkenlaan 1

52°15'33.0"N 4°31'53.1"E
loosterweg zuid 3

52°15'27.2"N 4°31'45.9"E
loosterweg zuid 2

52°15'11.7"N 4°31'35.3"E
loosterweg zuid 1

52°15'17.7"N 4°32'37.5"E
achterweg zuid 5

52°15'11.2"N 4°32'32.4"E
achterweg zuid 4

52°14'54.2"N 4°32'20.7"E
achterweg zuid 3

52°14'45.4"N 4°32'04.8"E
achterweg zuid 2

52°14'38.1"N 4°31'54.4"E
achterweg zuid 1

52°14'25.7"N 4°31'55.1"E
Akervoorderlaan 2

52°14'33.0"N 4°31'39.6"E
akervoorderlaan 1

52°14'49.2"N 4°32'02.5"E
essenlaan 3

52°14'56.1"N 4°31'49.0"E
essenlaan 2

52°15'03.0"N 4°31'38.3"E
essenlaan 1

52°15'04.4"N 4°31'23.4"E
loosterweg 5

52°14'54.3"N 4°31'07.7"E
loosterweg 4

52°14'45.1"N 4°31'06.1"E
johan speelmanweg 1

52°14'41.3"N 4°30'50.8"E
loosterweg 3

52°14'27.1"N 4°30'36.6"E
loosterweg 2

52°14'19.6"N 4°30'28.0"E
loosterweg 1

52°14'23.1"N 4°30'12.1"E
sgravendamseweg 3

52°14'54.8"N 4°29'16.7"E
sgravendamseweg 2

52°14'58.5"N 4°29'02.4"E
sgravendamseweg 1

52°14'09.7"N 4°28'56.9"E
leidsevaart 5

52°14'05.3"N 4°28'50.6"E
leidsevaart 4

52°13'59.6"N 4°28'42.1"E
leidsevaart 3

52°13'49.6"N 4°28'27.0"E
leidsevaart 2

52°13'25.6"N 4°28'23.9"E
leidsevaart 1

52°15'25.8"N 4°30'33.9"E
schippersvaartweg 2

52°15'32.5"N 4°30'16.8"E
schippersvaartweg 1

52°15'41.2"N 4°30'18.3"E
via nova 2

52°15'57.1"N 4°30'10.1"E
via nova 1

52°13'14.0"N 4°26'38.5"E
achterweg 1

52°13'29.4"N 4°26'34.0"E
herenweg nw 3

52°13'10.6"N 4°26'21.1"E
herenweg nw 2

52°13'00.4"N 4°26'19.1"E
herenweg nw 1

52°13'15.1"N 4°26'14.6"E
zwarteweg

52°13'40.6"N 4°25'38.8"E
het laantje 3

52°13'44.3"N 4°25'51.5"E
het laantje 2

52°13'51.6"N 4°26'06.3"E
het laantje 1

52°14'02.9"N 4°26'13.7"E
beeklaan 2

52°14'10.8"N 4°26'06.3"E
beeklaan

52°14'18.2"N 4°26'31.1"E
nieuwe zeeweg

52°13'49.3"N 4°27'54.0"E
leeweg 6

52°14'02.9"N 4°28'00.7"E
leeweg 5

52°14'13.7"N 4°28'08.3"E
leeweg 4

52°14'23.6"N 4°28'15.8"E
leeweg 3

52°14'34.1"N 4°28'24.5"E
leeweg 2

52°14'53.5"N 4°28'57.8"E
leeweg 1

52°13'58.5"N 4°27'43.5"E
bronsgeesterweg 3

52°14'11.9"N 4°27'55.6"E
bronsgeesterweg 2

52°14'25.9"N 4°28'07.9"E
bronsgeesterweg 1

52°16'25.5"N 4°29'50.3"E
langervelderweg 2

52°16'15.4"N 4°29'42.6"E
langervelderweg

52°15'43.2"N 4°27'19.9"E
duinweg 3

52°15'32.6"N 4°27'07.9"E
duinweg 2

52°15'04.3"N 4°26'59.2"E
duinweg 1

52°14'53.1"N 4°27'04.7"E
northgodreef

52°14'58.5"N 4°27'56.1"E
westeinde 6

52°15'04.6"N 4°28'05.0"E
westeinde 5

52°15'41.9"N 4°28'40.6"E
westeinde 4

52°15'36.6"N 4°28'30.0"E
westeinde 3

52°15'31.0"N 4°28'20.2"E
westeinde 2

52°15'13.2"N 4°28'21.9"E
westeinde 1

52°15'16.3"N 4°28'47.8"E
gooweg 1

52°15'36.4"N 4°29'01.8"E
schulpweg 2

52°15'53.9"N 4°28'29.4"E
schulpweg 1

52°16'10.5"N 4°28'28.9"E
kraaierslaan

52°16'52.5"N 4°29'17.6"E
langervelderlaan

52°17'35.7"N 4°29'53.0"E
vogelaarsdreef 2

52°17'42.6"N 4°30'11.7"E
vogelaarsdreef 1

52°17'07.1"N 4°29'59.2"E
wilgendam 1

52°17'24.9"N 4°29'42.8"E
wilgendam 2

52°17'19.6"N 4°30'02.9"E
de boender 2

52°17'27.4"N 4°30'24.7"E
de boender 1

52°17'25.3"N 4°30'46.5"E
duinschoten 4

52°17'13.7"N 4°30'29.2"E
duinschoten 3

52°17'05.3"N 4°30'17.5"E
duinschoten 2

52°16'56.4"N 4°30'01.7"E
duinschoten 1

52°16'34.4"N 4°30'01.3"E
boekhorsterweg

52°16'36.8"N 4°30'40.1"E
oosterduinen 3

52°16'53.2"N 4°30'55.0"E
oosterduinen 2

52°17'12.8"N 4°31'13.6"E
oosterduinen 1`;

const blocks = raw.trim().split(/\n\n+/);
const locations = [];
const slugCounts = {};

for (const block of blocks) {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) continue;
  const parts = lines[0].split(/\s+(?=\d+°)/);
  if (parts.length !== 2) continue;
  const lat = dmsToDecimal(parts[0]);
  const lng = dmsToDecimal(parts[1]);
  const address = lines[1];
  const baseSlug = toSlug(address);
  slugCounts[baseSlug] = (slugCounts[baseSlug] || 0) + 1;
  const slug = slugCounts[baseSlug] > 1 ? `${baseSlug}-${slugCounts[baseSlug]}` : baseSlug;
  locations.push({
    title: toTitleCase(address),
    slug,
    category: 'flower_field',
    latitude: lat,
    longitude: lng,
    address,
    short_description: `Bollenveld langs de ${toTitleCase(address.replace(/\d+$/, '').trim())} in de Bollenstreek.`,
    full_description: 'Bollenveld in de Bollenstreek, onderdeel van de Tulipday Adressen collectie. Bereikbaar langs de weg, ideaal voor een fietstocht of autorit door de regio.',
    flower_type: 'tulip',
    bloom_status: 'blooming',
    photo_score: 4,
    crowd_score: 4,
    access_type: 'roadside_only',
    parking_info: 'Beperkt parkeren langs de kant van de weg. Fiets aanbevolen.',
    best_visit_time: "Vroeg in de ochtend of golden hour voor de mooiste foto's.",
    image_url: MAPS_KEY
      ? `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${lat},${lng}&fov=90&pitch=5&key=${MAPS_KEY}`
      : null,
    is_featured: false,
    is_active: true,
  });
}

// Batch insert via Supabase REST API (max 100 per keer)
const BATCH_SIZE = 50;
let inserted = 0;
let errors = 0;

for (let i = 0; i < locations.length; i += BATCH_SIZE) {
  const batch = locations.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(batch),
  });

  if (res.ok) {
    inserted += batch.length;
    console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${locations.length} ingevoegd`);
  } else {
    const err = await res.text();
    console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} mislukt:`, err);
    errors++;
  }
}

console.log(`\nKlaar: ${inserted} locaties ingevoegd, ${errors} fouten`);
