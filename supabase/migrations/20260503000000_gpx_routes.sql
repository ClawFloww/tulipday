-- GPX fietsroutes Bollenstreek — geïmporteerd uit GPX + PDF bestanden
-- geometry_points: array van [lat, lng] punten uit de GPX track (6 representatieve punten)

ALTER TABLE routes ADD COLUMN IF NOT EXISTS geometry_points jsonb DEFAULT NULL;

INSERT INTO routes (id, title, slug, description, route_type, distance_km, duration_minutes, is_active, is_featured, attribution, geometry_points)
VALUES

  -- 1. Dahlia Tour (E-Step) — We Love Wheels, 31 km
  (gen_random_uuid(),
   'Dahlia Tour (E-Step)',
   'dahlia-tour-e-step',
   'Geniet van de dahlia''s en bollenvelden van de Bollenstreek op een elektrische step. Een ontspannen tocht van 3 uur vanuit Lisse langs de mooiste velden.',
   'bike', 31, 180, true, false, 'We Love Wheels',
   '[[52.26243,4.49256],[52.28367,4.48407],[52.29613,4.49752],[52.29977,4.54342],[52.25058,4.54136],[52.26243,4.49256]]'),

  -- 2. Duin en Bloemroute — 32 km
  (gen_random_uuid(),
   'Duin en Bloemroute',
   'duin-en-bloemroute',
   'Een lentefietstocht door de duinen en de kleurrijke bloemenvelden van Noordwijk. Afwisselend landschap met zeebries en tulpenkleuren.',
   'bike', 32, 195, true, true, null,
   '[[52.24895,4.43464],[52.27949,4.49529],[52.26266,4.47803],[52.23391,4.45835],[52.22884,4.42823],[52.24888,4.43481]]'),

  -- 3. Enjoy the Flowers — 37 km
  (gen_random_uuid(),
   'Enjoy the Flowers',
   'enjoy-the-flowers',
   'Prachtige lentetocht langs de bloemenvelden van de Duin en Bollenstreek via Hillegom naar Lisse. De route voert langs de meest spectaculaire bollenvelden.',
   'bike', 37, 140, true, true, null,
   '[[52.26244,4.49257],[52.29548,4.56281],[52.25524,4.55031],[52.22992,4.47484],[52.24814,4.43483],[52.26244,4.49257]]'),

  -- 4. Max Liebermann Fietsroute — 11 km
  (gen_random_uuid(),
   'Max Liebermann Fietsroute',
   'max-liebermann-fietsroute',
   'Geniet van een prachtige route door Noordwijk en bewonder de 24 kunstwerken van de impressionistische schilder Max Liebermann op bijzondere locaties.',
   'bike', 11, 40, true, false, null,
   '[[52.24423,4.43138],[52.25160,4.44496],[52.24005,4.44490],[52.23636,4.43894],[52.24053,4.42612],[52.24418,4.43139]]'),

  -- 5. Molen en Pontjes Route Kagerplassen — 39 km
  (gen_random_uuid(),
   'Molen en Pontjes Route Kagerplassen',
   'molen-en-pontjes-route-kagerplassen',
   'Fiets door het polderlandschap langs windmolens en glinsterende meren van de Kagerplassen. Oversteken met de pont maakt deze route extra bijzonder.',
   'bike', 39, 160, true, false, null,
   '[[52.23188,4.46181],[52.19960,4.49380],[52.21507,4.62042],[52.19796,4.53953],[52.18761,4.48962],[52.23188,4.46181]]'),

  -- 6. Mountainbike Route Noordwijk — 12 km
  (gen_random_uuid(),
   'Mountainbike Route Noordwijk',
   'mountainbike-route-noordwijk',
   'Uitdagende mountainbikeroute door bos en duin rondom Noordwijk. Technische singletracks afgewisseld met uitzichten over de Bollenstreek.',
   'bike', 12, 48, true, false, null,
   '[[52.26895,4.46655],[52.26863,4.46061],[52.27800,4.47698],[52.27874,4.49681],[52.26854,4.49461],[52.26957,4.46734]]'),

  -- 7. Nationaal Park Hollandse Duinen — 49 km
  (gen_random_uuid(),
   'Nationaal Park Hollandse Duinen',
   'nationaal-park-hollandse-duinen',
   'Ervaar de veelzijdigheid van het landschap en cultureel erfgoed tussen Noordwijk en Scheveningen. Een dag fietsen door duinen, polders en historische dorpen.',
   'bike', 49, 200, true, false, null,
   '[[52.24341,4.42959],[52.17382,4.36821],[52.10710,4.32029],[52.13004,4.39422],[52.19724,4.41859],[52.24341,4.42959]]'),

  -- 8. Route naar Circuit Zandvoort — 40 km
  (gen_random_uuid(),
   'Route naar Circuit Zandvoort',
   'route-naar-circuit-zandvoort',
   'Op de fiets naar het beroemde circuit van Zandvoort. De route voert door de duinen langs de kust en is perfect als uitje rondom de Dutch GP.',
   'bike', 40, 120, true, false, null,
   '[[52.24337,4.42953],[52.28543,4.47996],[52.35186,4.51227],[52.36913,4.52378],[52.30103,4.47781],[52.24320,4.42939]]'),

  -- 9. Space Bike Tour — 15 km
  (gen_random_uuid(),
   'Space Bike Tour',
   'space-bike-tour',
   'Ontdek de ruimtevaart in Noordwijk via deze unieke Augmented Reality fietsroute. Langs ESA-locaties en een bijzonder stukje Nederlandse ruimtegeschiedenis.',
   'bike', 15, 60, true, false, null,
   '[[52.24312,4.42933],[52.21978,4.40896],[52.20985,4.40961],[52.21802,4.44102],[52.23705,4.44384],[52.24312,4.42933]]'),

  -- 10. Gezellige Terrasjes Tour — 39 km
  (gen_random_uuid(),
   'Gezellige Terrasjes Tour',
   'terrasjes-tour',
   'Heerlijk fietsen door de Bollenstreek met tussenstops op gezellige terrassen. De route combineert mooie natuur met de lekkerste plekjes in de streek.',
   'bike', 39, 130, true, false, null,
   '[[52.24312,4.42933],[52.30085,4.47766],[52.30009,4.54403],[52.26582,4.48231],[52.23190,4.45985],[52.24312,4.42933]]'),

  -- 11. E-Step Tour 2 uur — We Love Wheels, 21 km
  (gen_random_uuid(),
   'E-Step Tour 2 uur (25 km)',
   'e-step-tour-2-uur',
   'Ontdek de bollenvelden en duinen van de Bollenstreek in 2 uur op een elektrische step vanuit Lisse. Ideaal voor een kort maar onvergetelijk uitje.',
   'bike', 21, 120, true, false, 'We Love Wheels',
   '[[52.26243,4.49256],[52.27281,4.46868],[52.24671,4.43183],[52.24237,4.43932],[52.23790,4.46654],[52.26243,4.49256]]'),

  -- 12. Zandvoort Route — 49 km
  (gen_random_uuid(),
   'Zandvoort Route',
   'zandvoort-route',
   'Uitgebreide dagtocht van de Bollenstreek naar Zandvoort langs strand en duinen. Een afwisselende route met prachtige vergezichten over de Noord-Hollandse kust.',
   'bike', 49, null, true, false, null,
   '[[52.27230,4.46828],[52.33037,4.49932],[52.36136,4.59870],[52.30293,4.55868],[52.26285,4.48991],[52.27230,4.46828]]')

ON CONFLICT (slug) DO NOTHING;
