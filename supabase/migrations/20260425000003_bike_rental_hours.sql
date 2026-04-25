-- Openingstijden fietsverhuur locaties (tulpenseizoen)
-- Formaat: {"mon":["HH:MM","HH:MM"], ...} — null = gesloten, sleutel afwezig = onbekend
-- Opmerking: Fietsenverhuur Noordwijk heeft gesplitste tijden (10-14 & 16-17:30),
--            opgeslagen als totaalspanne 10:00–17:30.

-- Rent-a-Bike van Dam (Lisse) — dagelijks 09:00–19:30
UPDATE locations
SET opening_hours = '{"mon":["09:00","19:30"],"tue":["09:00","19:30"],"wed":["09:00","19:30"],"thu":["09:00","19:30"],"fri":["09:00","19:30"],"sat":["09:00","19:30"],"sun":["09:00","19:30"]}'
WHERE slug = 'rent-a-bike-van-dam-lisse';

-- Lemonbike Lisse (Intratuin) — ma-za 09:30–17:30, zo 10:00–17:30
UPDATE locations
SET opening_hours = '{"mon":["09:30","17:30"],"tue":["09:30","17:30"],"wed":["09:30","17:30"],"thu":["09:30","17:30"],"fri":["09:30","17:30"],"sat":["09:30","17:30"],"sun":["10:00","17:30"]}'
WHERE slug = 'lemonbike-lisse';

-- Hulsebosch Fietsverhuur — dagelijks 09:00–18:00
UPDATE locations
SET opening_hours = '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","18:00"],"fri":["09:00","18:00"],"sat":["09:00","18:00"],"sun":["09:00","18:00"]}'
WHERE slug = 'hulsebosch-fietsverhuur';

-- Rent-a-Bike van Dam (Noordwijkerhout) — dagelijks 09:00–18:00
UPDATE locations
SET opening_hours = '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","18:00"],"fri":["09:00","18:00"],"sat":["09:00","18:00"],"sun":["09:00","18:00"]}'
WHERE slug = 'rent-a-bike-van-dam-noordwijkerhout';

-- Profile Paul Noordwijkerhout — ma-vr 08:15–17:15, zat 08:30–12:30, zo gesloten
UPDATE locations
SET opening_hours = '{"mon":["08:15","17:15"],"tue":["08:15","17:15"],"wed":["08:15","17:15"],"thu":["08:15","17:15"],"fri":["08:15","17:15"],"sat":["08:30","12:30"],"sun":null}'
WHERE slug = 'profile-paul-noordwijkerhout';

-- Lemonbike Noordwijk — dagelijks 10:00–17:30
UPDATE locations
SET opening_hours = '{"mon":["10:00","17:30"],"tue":["10:00","17:30"],"wed":["10:00","17:30"],"thu":["10:00","17:30"],"fri":["10:00","17:30"],"sat":["10:00","17:30"],"sun":["10:00","17:30"]}'
WHERE slug = 'lemonbike-noordwijk';

-- Fietsenverhuur Noordwijk — dagelijks 10:00–14:00 & 16:00–17:30 (opgeslagen als 10:00–17:30)
UPDATE locations
SET opening_hours = '{"mon":["10:00","17:30"],"tue":["10:00","17:30"],"wed":["10:00","17:30"],"thu":["10:00","17:30"],"fri":["10:00","17:30"],"sat":["10:00","17:30"],"sun":["10:00","17:30"]}'
WHERE slug = 'fietsenverhuur-noordwijk';

-- Lemonbike Hillegom — dagelijks 09:00–18:00
UPDATE locations
SET opening_hours = '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","18:00"],"fri":["09:00","18:00"],"sat":["09:00","18:00"],"sun":["09:00","18:00"]}'
WHERE slug = 'lemonbike-hillegom';

-- Profile Paul Katwijk — ma-wo/vr 09:00–18:00, do 09:00–21:00, zat 09:00–17:00, zo gesloten
UPDATE locations
SET opening_hours = '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","21:00"],"fri":["09:00","18:00"],"sat":["09:00","17:00"],"sun":null}'
WHERE slug = 'profile-paul-katwijk';
