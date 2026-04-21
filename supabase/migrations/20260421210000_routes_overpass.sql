-- Vervang routedatabank door overpass in routes-tabel
-- Verwijder routedatabank_id kolom (indien aanwezig) en voeg overpass_node_ids toe
ALTER TABLE routes DROP COLUMN IF EXISTS routedatabank_id;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS overpass_node_ids TEXT[];

-- Pas source CHECK constraint aan
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_source_check;
ALTER TABLE routes ADD CONSTRAINT routes_source_check
  CHECK (source IN ('osm', 'overpass', 'tulipday', 'mixed'));
