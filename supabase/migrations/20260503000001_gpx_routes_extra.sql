-- 6 extra fietsroutes — GPX + PDF data
-- VVV Lisse routes en familietochten Bollenstreek

INSERT INTO routes (id, title, slug, description, route_type, distance_km, duration_minutes, is_active, is_featured, attribution, geometry_points)
VALUES

  -- 1. Fietsen door de duinen — VVV Lisse, 54 km
  (gen_random_uuid(),
   'Fietsen door de duinen',
   'fietsen-door-de-duinen',
   'Een fietstocht door de duinen en natuurgebieden van Holland met prachtige zeegezichten. De route voert langs de mooiste kustgebieden tussen Lisse en de Noord-Hollandse duinen.',
   'bike', 54, 192, true, false, 'VVV Lisse',
   '[[52.27178,4.46868],[52.33910,4.50467],[52.38312,4.58785],[52.32892,4.58012],[52.27980,4.50218],[52.27178,4.46868]]'),

  -- 2. Fietsen langs de Kagerplassen — VVV Lisse, 34 km
  (gen_random_uuid(),
   'Fietsen langs de Kagerplassen',
   'fietsen-langs-de-kagerplassen',
   'Een rustige fietstocht langs de prachtige Kagerplassen en natuurgebieden in de Bollenstreek. Genieten van het water, de polders en de karakteristieke dorpjes.',
   'bike', 34, 120, true, false, 'VVV Lisse',
   '[[52.21319,4.50481],[52.21489,4.61280],[52.19378,4.63096],[52.19133,4.56442],[52.18566,4.51133],[52.21319,4.50481]]'),

  -- 3. Fietsen langs kastelen en buitenplaatsen — VVV Lisse, 44 km
  (gen_random_uuid(),
   'Fietsen langs kastelen en buitenplaatsen',
   'fietsen-langs-kastelen-en-buitenplaatsen',
   'Een historische fietstocht langs kastelen, landgoederen en karakteristieke buitenplaatsen in de Bollenstreek. Cultuur en natuur in één mooie route.',
   'bike', 44, 154, true, false, 'VVV Lisse',
   '[[52.25774,4.55324],[52.20936,4.51150],[52.19335,4.46720],[52.23537,4.44681],[52.27993,4.49409],[52.25774,4.55324]]'),

  -- 4. De Fun & Fiets Route — gezinsroute, 17 km
  (gen_random_uuid(),
   'De Fun & Fiets Route',
   'de-fun-fiets-route',
   'Fiets je kids blij: langs waterpret, klimtoestellen en een lekker ijsje toe. Een gezellige familietocht van 17 km die voor jong en oud plezier biedt.',
   'family', 17, 90, true, false, null,
   '[[52.26243,4.49256],[52.28554,4.50852],[52.29590,4.50704],[52.30089,4.47767],[52.28321,4.47452],[52.26243,4.49256]]'),

  -- 5. Familie rondje Noordwijkerhout — gezinsroute, 23 km
  (gen_random_uuid(),
   'Familie rondje Noordwijkerhout',
   'familie-rondje-noordwijkerhout',
   'Een gezellige fietstocht voor het hele gezin door Noordwijkerhout en omgeving. Rustige wegen, mooie bollenvelden en genoeg te zien voor de kleinste fietsers.',
   'family', 23, 90, true, false, null,
   '[[52.26243,4.49256],[52.28187,4.47089],[52.29701,4.50216],[52.29161,4.53529],[52.28469,4.51724],[52.26243,4.49256]]'),

  -- 6. Lente bloemenfietstocht — 29 km
  (gen_random_uuid(),
   'Lente bloemenfietstocht',
   'lentefietstocht',
   'Een fietstocht langs de mooie bloemenvelden van de Duin en Bollenstreek richting Lisse. Ideaal in het voorjaar wanneer de bollenvelden in volle bloei staan.',
   'bike', 29, 180, true, true, null,
   '[[52.24896,4.43460],[52.26400,4.48459],[52.28098,4.52850],[52.24774,4.53717],[52.22461,4.46972],[52.24882,4.43497]]')

ON CONFLICT (slug) DO NOTHING;
