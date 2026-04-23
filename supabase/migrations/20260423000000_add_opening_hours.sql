-- ============================================================
-- Voeg openingstijden toe aan locations tabel
-- ============================================================
-- Format: {"mon": ["09:00","21:00"], "tue": null, ...}
-- null = gesloten op die dag, ontbrekende dag = onbekend

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT NULL;
