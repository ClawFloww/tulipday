-- Handmatige locatieselectie per homepage-sectie
-- section_key: 'best_blooms' | 'recommended' | 'photo_spots'

CREATE TABLE IF NOT EXISTS homepage_picks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text    NOT NULL CHECK (section_key IN ('best_blooms', 'recommended', 'photo_spots')),
  location_id uuid    NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  sort_order  smallint NOT NULL DEFAULT 0,
  UNIQUE (section_key, location_id)
);

ALTER TABLE homepage_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen mag homepage_picks lezen"
  ON homepage_picks FOR SELECT USING (true);
