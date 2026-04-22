-- Bloemencorso foto-feed v2: likes, meldingen, realtime

-- Voeg nieuwe kolommen toe
ALTER TABLE corso_photos
  ADD COLUMN IF NOT EXISTS user_id     TEXT,
  ADD COLUMN IF NOT EXISTS likes       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false;

-- Realtime inschakelen voor live foto-teller
ALTER TABLE corso_photos REPLICA IDENTITY FULL;

-- Status default: approved voor live evenement (geen moderatievertraging)
ALTER TABLE corso_photos
  ALTER COLUMN status SET DEFAULT 'approved';

-- RLS: verberg gemelde foto's ook in de leesquery
DROP POLICY IF EXISTS "read approved photos" ON corso_photos;
CREATE POLICY "read approved photos" ON corso_photos
  FOR SELECT USING (status = 'approved' AND is_reported = false);

-- RLS: sta likes en meldingen toe (UPDATE)
DROP POLICY IF EXISTS "update corso photos" ON corso_photos;
CREATE POLICY "update corso photos" ON corso_photos
  FOR UPDATE USING (true);
