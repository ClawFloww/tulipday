-- ============================================================
-- Gedeelde eigen routes (deelbare link zonder account)
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_routes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id   text        UNIQUE NOT NULL DEFAULT substr(md5(gen_random_uuid()::text), 1, 8),
  name       text        NOT NULL,
  waypoints  jsonb       NOT NULL,   -- [[lng,lat], ...]
  cycling    jsonb       DEFAULT NULL, -- {duration,distance} | null
  walking    jsonb       DEFAULT NULL,
  driving    jsonb       DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shared_routes ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen
CREATE POLICY "public_read_shared_routes"
  ON shared_routes FOR SELECT TO public USING (true);

-- Anoniem mag aanmaken (geen account vereist)
CREATE POLICY "anon_insert_shared_routes"
  ON shared_routes FOR INSERT TO anon WITH CHECK (true);
