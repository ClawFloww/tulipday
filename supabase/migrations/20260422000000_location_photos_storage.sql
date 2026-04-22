-- ============================================================
-- Storage bucket voor UGC foto uploads
-- ============================================================

-- Maak de bucket aan als die nog niet bestaat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'location-photos',
  'location-photos',
  true,
  8388608,  -- 8 MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Iedereen (incl. anoniem) mag foto's uploaden
DROP POLICY IF EXISTS "anon_insert_location_photos" ON storage.objects;
CREATE POLICY "anon_insert_location_photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'location-photos');

-- Publiek leesbaar (voor de <img> tags)
DROP POLICY IF EXISTS "public_select_location_photos" ON storage.objects;
CREATE POLICY "public_select_location_photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'location-photos');
