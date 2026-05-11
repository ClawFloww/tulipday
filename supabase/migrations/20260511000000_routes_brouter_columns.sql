-- Voeg tracking-kolommen toe voor BRouter geometry-generatie.
-- geometry_points bestond al — we voegen alleen metadata toe zodat
-- admins kunnen zien welke routes al gerouted zijn en via welk profiel.

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS routing_profile text,
  ADD COLUMN IF NOT EXISTS routed_at       timestamptz;

COMMENT ON COLUMN routes.routing_profile IS
  'BRouter-profiel waarmee geometry_points is gegenereerd (hiking-mountain / trekking / safety / shortest)';
COMMENT ON COLUMN routes.routed_at IS
  'Tijdstip waarop geometry_points voor het laatst via BRouter is bijgewerkt';

-- Index om snel ongerenderde routes te vinden
CREATE INDEX IF NOT EXISTS routes_routed_at_idx ON routes (routed_at NULLS FIRST);
