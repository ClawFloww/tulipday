-- TulipDay: gecombineerde migratie (attributie + waypoints + 4 routes + overpass)
-- Veilig om meerdere keren uit te voeren (IF NOT EXISTS / ON CONFLICT)

-- 1. Attributievelden
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS source            TEXT NOT NULL DEFAULT 'tulipday',
  ADD COLUMN IF NOT EXISTS license           TEXT NOT NULL DEFAULT 'Proprietary',
  ADD COLUMN IF NOT EXISTS attribution       TEXT NOT NULL DEFAULT 'TulipDay eigen route',
  ADD COLUMN IF NOT EXISTS source_url        TEXT,
  ADD COLUMN IF NOT EXISTS osm_relation      TEXT,
  ADD COLUMN IF NOT EXISTS theme             TEXT,
  ADD COLUMN IF NOT EXISTS bloom_peak        TEXT[],
  ADD COLUMN IF NOT EXISTS photo_spots       JSONB,
  ADD COLUMN IF NOT EXISTS overpass_node_ids TEXT[];

ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_source_check;
ALTER TABLE routes ADD CONSTRAINT routes_source_check
  CHECK (source IN ('osm', 'overpass', 'tulipday', 'mixed'));

-- 2. route_waypoints tabel
CREATE TABLE IF NOT EXISTS route_waypoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sequence    INTEGER NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  node_number TEXT,
  label       TEXT,
  type        TEXT CHECK (type IN ('knoop', 'poi', 'foto', 'rust', 'start', 'eind')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_waypoints_route ON route_waypoints(route_id);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_seq   ON route_waypoints(route_id, sequence);

ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "route_waypoints_public_read" ON route_waypoints;
CREATE POLICY "route_waypoints_public_read" ON route_waypoints FOR SELECT USING (true);

-- 3. Vier gecureerde routes
INSERT INTO routes (slug, title, description, route_type, distance_km, duration_minutes, is_active, is_featured, source, license, attribution, theme, bloom_peak, photo_spots, cover_image_url)
VALUES
(
  'tulpen-koffie-lisse',
  'Tulpen & Koffie Lisse',
  'Een heerlijke wandeling door de bloeiende tulpenvelden rondom Lisse, met een tussenstop bij een lokaal koffiehuis. Geniet van de kleurrijke akkers en de typische rust van de Bollenstreek.',
  'walk', 6.0, 90, true, true,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'tulpen-koffie', ARRAY['april', 'mei'],
  '[{"lat":52.2580,"lng":4.5590,"tip_nl":"Uitkijkpunt langs de Heereweg"},{"lat":52.2530,"lng":4.5510,"tip_nl":"Molen De Leeuw"},{"lat":52.2500,"lng":4.5620,"tip_nl":"Panorama over de polder"}]'::jsonb,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
),
(
  'rustige-ochtend-hillegom',
  'Rustige Ochtend Hillegom',
  'Een korte, stille ochtendwandeling door de bollenvelden ten noorden van Hillegom. Ideaal voor vroege vogels die de velden willen zien voordat de drukte begint.',
  'walk', 4.0, 60, true, false,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'ochtendwandeling', ARRAY['maart', 'april'],
  '[{"lat":52.2960,"lng":4.5750,"tip_nl":"Ochtendlicht over de narcissenvelden"},{"lat":52.2920,"lng":4.5800,"tip_nl":"Oude bollenschuur langs de Leidsestraat"}]'::jsonb,
  'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?w=800'
),
(
  'gezinsfietsroute-keukenhof-sassenheim',
  'Gezinsfietsroute Keukenhof-Sassenheim',
  'Een kindvriendelijke fietsroute die start bij Keukenhof en langs de mooiste bollenvelden van Sassenheim loopt. Vlak terrein, fietspaden en volop bloemen onderweg.',
  'bike', 14.0, 55, true, true,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'gezinsroute', ARRAY['april', 'mei'],
  '[{"lat":52.2697,"lng":4.5461,"tip_nl":"Startpunt Keukenhof"},{"lat":52.2580,"lng":4.5350,"tip_nl":"Fietspad langs de Ringvaart"},{"lat":52.2239,"lng":4.5208,"tip_nl":"Doorkijk over de polder"}]'::jsonb,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca5128?w=800'
),
(
  'knooppuntenroute-bollenstreek',
  'Knooppuntenroute Bollenstreek',
  'De klassieke fietsknooppuntenroute door de hele Bollenstreek. Van Hillegom via Lisse en Sassenheim naar Noordwijk, langs de mooiste bollenvelden van de regio.',
  'bike', 28.0, 110, true, true,
  'osm', 'ODbL 1.0', '© OpenStreetMap contributors',
  'fietsknooppunten', ARRAY['april', 'mei'],
  '[{"lat":52.2917,"lng":4.5783,"tip_nl":"Knooppunt 14 Hillegom"},{"lat":52.2553,"lng":4.5573,"tip_nl":"Knooppunt 27 Lisse"},{"lat":52.2239,"lng":4.5208,"tip_nl":"Knooppunt 33 Sassenheim"},{"lat":52.2378,"lng":4.4436,"tip_nl":"Knooppunt 08 Noordwijk"}]'::jsonb,
  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800'
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Waypoints — Tulpen & Koffie Lisse
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2553, 4.5573, 'Start Lisse centrum', 'start'),
  (2, 52.2580, 4.5590, 'Heereweg',            'rust'),
  (3, 52.2530, 4.5510, 'Molen De Leeuw',      'foto'),
  (4, 52.2500, 4.5620, 'Polderpanorama',       'foto'),
  (5, 52.2553, 4.5573, 'Terug Lisse centrum',  'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'tulpen-koffie-lisse'
  AND NOT EXISTS (SELECT 1 FROM route_waypoints rw WHERE rw.route_id = r.id);

-- 4. Waypoints — Rustige Ochtend Hillegom
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2917, 4.5783, 'Start Hillegom',  'start'),
  (2, 52.2960, 4.5750, 'Narcissenvelden', 'foto'),
  (3, 52.2920, 4.5800, 'Bollenschuur',    'poi'),
  (4, 52.2917, 4.5783, 'Terug Hillegom',  'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'rustige-ochtend-hillegom'
  AND NOT EXISTS (SELECT 1 FROM route_waypoints rw WHERE rw.route_id = r.id);

-- 4. Waypoints — Gezinsfietsroute
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2697, 4.5461, 'Keukenhof',          'start'),
  (2, 52.2580, 4.5350, 'Ringvaart fietspad',  'rust'),
  (3, 52.2400, 4.5280, 'Tussenpunt polder',   'knoop'),
  (4, 52.2239, 4.5208, 'Sassenheim centrum',  'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'gezinsfietsroute-keukenhof-sassenheim'
  AND NOT EXISTS (SELECT 1 FROM route_waypoints rw WHERE rw.route_id = r.id);

-- 4. Waypoints — Knooppuntenroute Bollenstreek
INSERT INTO route_waypoints (route_id, sequence, lat, lng, node_number, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.node, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2917, 4.5783, '14', 'Hillegom',   'start'),
  (2, 52.2800, 4.5750, '22', NULL,          'knoop'),
  (3, 52.2700, 4.5700, '19', NULL,          'knoop'),
  (4, 52.2553, 4.5573, '27', 'Lisse',       'knoop'),
  (5, 52.2450, 4.5400, '31', NULL,          'knoop'),
  (6, 52.2239, 4.5208, '33', 'Sassenheim',  'knoop'),
  (7, 52.2300, 4.4900, '42', NULL,          'knoop'),
  (8, 52.2378, 4.4436, '08', 'Noordwijk',   'eind')
) AS v(seq, lat, lng, node, lbl, typ)
WHERE r.slug = 'knooppuntenroute-bollenstreek'
  AND NOT EXISTS (SELECT 1 FROM route_waypoints rw WHERE rw.route_id = r.id);
