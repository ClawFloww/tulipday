-- Bloemencorso live photo-blog table
CREATE TABLE IF NOT EXISTS corso_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  caption       text,
  image_url     text NOT NULL,
  stop_id       text NOT NULL,
  stop_naam     text NOT NULL,
  lat           double precision,
  lng           double precision,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  uploader_ip   text
);

ALTER TABLE corso_photos ENABLE ROW LEVEL SECURITY;

-- Public can only read approved photos
CREATE POLICY "corso_select_approved"
  ON corso_photos FOR SELECT
  USING (status = 'approved');

-- Anyone can upload (insert)
CREATE POLICY "corso_insert"
  ON corso_photos FOR INSERT
  WITH CHECK (true);

-- Update allowed for all (admin route is password-protected; service role bypasses this anyway)
CREATE POLICY "corso_update"
  ON corso_photos FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS corso_photos_created_at_idx ON corso_photos (created_at DESC);
CREATE INDEX IF NOT EXISTS corso_photos_stop_idx       ON corso_photos (stop_id, status);
