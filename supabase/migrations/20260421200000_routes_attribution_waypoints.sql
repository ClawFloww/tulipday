-- TulipDay: attributievelden op routes-tabel + route_waypoints + 4 gecureerde routes
-- Voer uit in: Supabase Dashboard → SQL Editor

-- ── 1. Attributievelden toevoegen aan bestaande routes-tabel ─────────────────

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'tulipday'
    CHECK (source IN ('osm', 'routedatabank', 'tulipday', 'mixed')),
  ADD COLUMN IF NOT EXISTS license     TEXT NOT NULL DEFAULT 'Proprietary',
  ADD COLUMN IF NOT EXISTS attribution TEXT NOT NULL DEFAULT 'TulipDay eigen route',
  ADD COLUMN IF NOT EXISTS source_url  TEXT,
  ADD COLUMN IF NOT EXISTS osm_relation TEXT,
  ADD COLUMN IF NOT EXISTS theme       TEXT,
  ADD COLUMN IF NOT EXISTS bloom_peak  TEXT[],
  ADD COLUMN IF NOT EXISTS photo_spots JSONB;

-- ── 2. route_waypoints — GPS-navigatiepunten (anders dan route_stops) ────────

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
CREATE POLICY "route_waypoints_public_read" ON route_waypoints FOR SELECT USING (true);

-- ── 3. Vier gecureerde TulipDay-routes ───────────────────────────────────────

INSERT INTO routes (
  slug, title, description, route_type, distance_km, duration_minutes,
  is_active, is_featured, source, license, attribution, theme, bloom_peak, photo_spots, cover_image_url
) VALUES

-- Route 1: Tulpen & Koffie Lisse
(
  'tulpen-koffie-lisse',
  'Tulpen & Koffie Lisse',
  'Een heerlijke wandeling door de bloeiende tulpenvelden rondom Lisse, met een tussenstop bij een lokaal koffiehuis. Geniet van de kleurrijke akkers en de typische rust van de Bollenstreek.',
  'walk', 6.0, 90, true, true,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'tulpen-koffie', ARRAY['april', 'mei'],
  '[
    {"lat": 52.2580, "lng": 4.5590, "tip_nl": "Uitkijkpunt langs de Heereweg — kleurrijke tulpenvelden links en rechts"},
    {"lat": 52.2530, "lng": 4.5510, "tip_nl": "Molen De Leeuw — mooi fotomoment met velden op de achtergrond"},
    {"lat": 52.2500, "lng": 4.5620, "tip_nl": "Panorama over de polder richting Keukenhof bij laagstaande zon"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
),

-- Route 2: Rustige Ochtend Hillegom
(
  'rustige-ochtend-hillegom',
  'Rustige Ochtend Hillegom',
  'Een korte, stille ochtendwandeling door de bollenvelden ten noorden van Hillegom. Ideaal voor vroege vogels die de velden willen zien voordat de drukte begint.',
  'walk', 4.0, 60, true, false,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'ochtendwandeling', ARRAY['maart', 'april'],
  '[
    {"lat": 52.2960, "lng": 4.5750, "tip_nl": "Ochtendlicht over de narcissenvelden — beste foto rond zonsopgang"},
    {"lat": 52.2920, "lng": 4.5800, "tip_nl": "Oude bollenschuur langs de Leidsestraat — typisch Bollenstreek"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?w=800'
),

-- Route 3: Gezinsfietsroute Keukenhof–Sassenheim
(
  'gezinsfietsroute-keukenhof-sassenheim',
  'Gezinsfietsroute Keukenhof–Sassenheim',
  'Een kindvriendelijke fietsroute die start bij Keukenhof en langs de mooiste bollenvelden van Sassenheim loopt. Vlak terrein, fietspaden en volop bloemen onderweg.',
  'bike', 14.0, 55, true, true,
  'tulipday', 'Proprietary', 'TulipDay eigen route',
  'gezinsroute', ARRAY['april', 'mei'],
  '[
    {"lat": 52.2697, "lng": 4.5461, "tip_nl": "Startpunt Keukenhof — groepsfoto bij het tulpenveld aan de ingang"},
    {"lat": 52.2580, "lng": 4.5350, "tip_nl": "Fietspad langs de Ringvaart — kleurrijke velden aan beide zijden"},
    {"lat": 52.2239, "lng": 4.5208, "tip_nl": "Doorkijk over de polder richting Sassenheim centrum"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1558618047-3c8c76ca5128?w=800'
),

-- Route 4: Knooppuntenroute Bollenstreek (OSM-data)
(
  'knooppuntenroute-bollenstreek',
  'Knooppuntenroute Bollenstreek',
  'De klassieke fietsknooppuntenroute door de hele Bollenstreek. Van Hillegom via Lisse en Sassenheim naar Noordwijk, langs de mooiste bollenvelden van de regio.',
  'bike', 28.0, 110, true, true,
  'osm', 'ODbL 1.0', '© OpenStreetMap contributors',
  'fietsknooppunten', ARRAY['april', 'mei'],
  '[
    {"lat": 52.2917, "lng": 4.5783, "tip_nl": "Knooppunt 14 Hillegom — doorkijk over de bollenpolder"},
    {"lat": 52.2553, "lng": 4.5573, "tip_nl": "Knooppunt 27 Lisse — rustpunt bij bloeiende hyacintenvelden"},
    {"lat": 52.2239, "lng": 4.5208, "tip_nl": "Knooppunt 33 Sassenheim — uitkijkpunt over de Ringvaart"},
    {"lat": 52.2378, "lng": 4.4436, "tip_nl": "Knooppunt 08 Noordwijk — eindpunt richting de kust"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800'
)
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Waypoints per route ────────────────────────────────────────────────────

-- Tulpen & Koffie Lisse
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2553, 4.5573, 'Start Lisse centrum',  'start'),
  (2, 52.2580, 4.5590, 'Heereweg',             'rust'),
  (3, 52.2530, 4.5510, 'Molen De Leeuw',       'foto'),
  (4, 52.2500, 4.5620, 'Polderpanorama',        'foto'),
  (5, 52.2553, 4.5573, 'Terug Lisse centrum',   'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'tulpen-koffie-lisse';

-- Rustige Ochtend Hillegom
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2917, 4.5783, 'Start Hillegom',    'start'),
  (2, 52.2960, 4.5750, 'Narcissenvelden',   'foto'),
  (3, 52.2920, 4.5800, 'Bollenschuur',      'poi'),
  (4, 52.2917, 4.5783, 'Terug Hillegom',    'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'rustige-ochtend-hillegom';

-- Gezinsfietsroute Keukenhof–Sassenheim
INSERT INTO route_waypoints (route_id, sequence, lat, lng, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2697, 4.5461, 'Keukenhof',           'start'),
  (2, 52.2580, 4.5350, 'Ringvaart fietspad',  'rust'),
  (3, 52.2400, 4.5280, 'Tussenpunt polder',   'knoop'),
  (4, 52.2239, 4.5208, 'Sassenheim centrum',  'eind')
) AS v(seq, lat, lng, lbl, typ)
WHERE r.slug = 'gezinsfietsroute-keukenhof-sassenheim';

-- Knooppuntenroute Bollenstreek
INSERT INTO route_waypoints (route_id, sequence, lat, lng, node_number, label, type)
SELECT r.id, v.seq, v.lat, v.lng, v.node, v.lbl, v.typ
FROM routes r,
(VALUES
  (1, 52.2917, 4.5783, '14', 'Hillegom',    'start'),
  (2, 52.2800, 4.5750, '22', NULL,           'knoop'),
  (3, 52.2700, 4.5700, '19', NULL,           'knoop'),
  (4, 52.2553, 4.5573, '27', 'Lisse',        'knoop'),
  (5, 52.2450, 4.5400, '31', NULL,           'knoop'),
  (6, 52.2239, 4.5208, '33', 'Sassenheim',   'knoop'),
  (7, 52.2300, 4.4900, '42', NULL,           'knoop'),
  (8, 52.2378, 4.4436, '08', 'Noordwijk',    'eind')
) AS v(seq, lat, lng, node, lbl, typ)
WHERE r.slug = 'knooppuntenroute-bollenstreek';
