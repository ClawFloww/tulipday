-- Voeg website_url kolom toe als die nog niet bestaat
ALTER TABLE locations ADD COLUMN IF NOT EXISTS website_url text DEFAULT NULL;

-- Fietsverhuur locaties Bollenstreek
INSERT INTO locations (id, title, slug, category, latitude, longitude, address, short_description, bloom_status, access_type, is_active, is_featured, website_url)
VALUES
  -- Lisse / Keukenhof
  (gen_random_uuid(), 'Rent-a-Bike van Dam (Lisse)', 'rent-a-bike-van-dam-lisse', 'bike_rental', 52.2707, 4.5470, 'Stationsweg 166a, 2161 AM Lisse', 'Fietsverhuur direct naast Keukenhof. Ideaal startpunt voor een bollenvelden-fietstocht.', null, 'public_access', true, false, 'https://www.rentabikevandam-keukenhof.nl'),
  (gen_random_uuid(), 'Lemonbike Lisse (Intratuin)', 'lemonbike-lisse', 'bike_rental', 52.2680, 4.5610, 'Heereweg 350, 2161 BG Lisse', 'Elektrische en gewone fietsen te huur bij de Intratuin in Lisse. Ruime keuze en goede service.', null, 'public_access', true, false, 'https://www.lemonbike.nl'),
  (gen_random_uuid(), 'Hulsebosch Fietsverhuur', 'hulsebosch-fietsverhuur', 'bike_rental', 52.2820, 4.5320, 'Loosterweg Zuid 7, 2161 NA Lisse', 'Vertrouwde fietsverhuur bij de Hertjes in Lisse, midden in het bollengebied.', null, 'public_access', true, false, 'https://www.hulseboschfietsenverhuur.nl'),

  -- Noordwijkerhout
  (gen_random_uuid(), 'Rent-a-Bike van Dam (Noordwijkerhout)', 'rent-a-bike-van-dam-noordwijkerhout', 'bike_rental', 52.2630, 4.4940, 'Landbouwplein 10, 2211 SB Noordwijkerhout', 'Fietsverhuur in het hart van Noordwijkerhout, vlakbij de bollenvelden.', null, 'public_access', true, false, 'https://www.rentabikevandam.nl'),
  (gen_random_uuid(), 'Profile Paul Noordwijkerhout', 'profile-paul-noordwijkerhout', 'bike_rental', 52.2628, 4.4928, 'Dorpsstraat 48, 2211 GE Noordwijkerhout', 'Professionele fietsenzaak met verhuur in Noordwijkerhout. Goede keuze in stadsfiets en e-bike.', null, 'public_access', true, false, 'https://www.profilepaul.nl'),

  -- Noordwijk
  (gen_random_uuid(), 'Lemonbike Noordwijk', 'lemonbike-noordwijk', 'bike_rental', 52.2420, 4.4450, 'Nieuwe Offemweg 2A, 2202 BH Noordwijk', 'Fietsverhuur aan de rand van Noordwijk, handig voor strandroutes en bollenveldentochten.', null, 'public_access', true, false, 'https://www.lemonbike.nl'),
  (gen_random_uuid(), 'Fietsenverhuur Noordwijk', 'fietsenverhuur-noordwijk', 'bike_rental', 52.2380, 4.4430, 'Albert Verweystraat 40, 2202 RB Noordwijk', 'Lokale fietsverhuur in Noordwijk met ruime keuze voor gezinnen en groepen.', null, 'public_access', true, false, 'https://www.fietsenverhuurnoordwijk.nl'),

  -- Hillegom & Katwijk
  (gen_random_uuid(), 'Lemonbike Hillegom', 'lemonbike-hillegom', 'bike_rental', 52.2870, 4.5810, 'Veenenburgerlaan 73A, 2182 HC Hillegom', 'Fietsverhuur in Hillegom midden in de bollenstreek. Elektrische fietsen beschikbaar.', null, 'public_access', true, false, 'https://www.lemonbike.nl'),
  (gen_random_uuid(), 'Profile Paul Katwijk', 'profile-paul-katwijk', 'bike_rental', 52.2020, 4.4060, 'Drieplassenweg 1, 2221 AL Katwijk', 'Fietsenverhuur bij Profile Paul in Katwijk, handig voor tochten richting de bollenvelden.', null, 'public_access', true, false, 'https://www.profilepaul.nl')

ON CONFLICT (slug) DO NOTHING;
