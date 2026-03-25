-- ============================================================
-- SEED DATA: locations
-- ============================================================
insert into locations (id, title, slug, category, latitude, longitude, address, short_description, full_description, flower_type, bloom_status, photo_score, crowd_score, access_type, parking_info, best_visit_time, image_url, is_featured, is_active)
values

-- Keukenhof
(
  gen_random_uuid(),
  'Keukenhof',
  'keukenhof',
  'attraction',
  52.2697, 4.5469,
  'Stationsweg 166A, 2161 AM Lisse',
  'De beroemdste bloementuin ter wereld met meer dan 7 miljoen bloembollen.',
  'Keukenhof is de meest bekende bloementuin van Nederland en trekt jaarlijks ruim 1,4 miljoen bezoekers. De tuin beslaat 32 hectare en is gevuld met tulpen, narcissen, hyacinten en vele andere bloemen. Een must-visit tijdens het tulpenseizoen.',
  'tulip, narcis, hyacint',
  'peak',
  5, 2,
  'public_access',
  'Groot parkeerterrein aanwezig (€6 per dag). Shuttle beschikbaar vanuit Leiden en Schiphol.',
  'Vroeg in de ochtend (voor 10:00) of laat in de middag (na 15:00) voor minder drukte.',
  'https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=800',
  true, true
),

-- Bollenstreek Lisse
(
  gen_random_uuid(),
  'Bollenstreek Lisse',
  'bollenstreek-lisse',
  'flower_field',
  52.2558, 4.5567,
  'Heereweg, 2161 Lisse',
  'Uitgestrekte bollenvelden langs de Heereweg met kleurrijke strepen in het landschap.',
  'De Heereweg in Lisse staat bekend om de prachtige bollenvelden aan weerszijden. In april kleuren de velden in felle strepen van rood, geel, roze en paars. Vrij toegankelijk vanuit de auto of fiets.',
  'tulip',
  'blooming',
  5, 3,
  'roadside_only',
  'Beperkt parkeren langs de kant van de weg. Fiets aanbevolen.',
  'Gouden uur (zonsopgang of zonsondergang) voor de mooiste foto''s.',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  true, true
),

-- Anna Paulowna tulpenvelden
(
  gen_random_uuid(),
  'Tulpenvelden Anna Paulowna',
  'tulpenvelden-anna-paulowna',
  'flower_field',
  52.8628, 4.8389,
  'Polderdijk, 1761 Anna Paulowna',
  'Enorme open poldervelden vol tulpen met uitzicht tot aan de horizon.',
  'In de polder van Anna Paulowna liggen kilometers aan bollenvelden. Door het vlakke landschap heb je een vrij uitzicht over de velden. Minder druk dan de Bollenstreek, ideaal voor rustige fotosessies.',
  'tulip',
  'early',
  4, 5,
  'roadside_only',
  'Ruim parkeren langs de polderdijk.',
  'Doordeweeks vroeg in de ochtend voor het rustigst.',
  'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800',
  false, true
),

-- Fotospot Windmolen De Zwaan
(
  gen_random_uuid(),
  'Windmolen De Zwaan & Tulpenveld',
  'windmolen-de-zwaan',
  'photo_spot',
  52.4762, 4.7912,
  'Overtoom 2, 1432 Aalsmeer',
  'Iconische combinatie van een historische windmolen omringd door tulpenvelden.',
  'Een van de meest gefotografeerde plekken tijdens het tulpenseizoen. De molen staat direct naast uitgestrekte tulpenvelden en biedt een typisch Hollands plaatje. Goed bereikbaar met de fiets.',
  'tulip',
  'peak',
  5, 3,
  'public_access',
  'Klein parkeerterrein (gratis) op 200 meter lopen.',
  'Vroeg in de ochtend voor mist-sfeer of golden hour voor warme kleuren.',
  'https://images.unsplash.com/photo-1541971297127-c4e6f2957bad?w=800',
  true, true
),

-- Parkeerplaats Keukenhof fietsers
(
  gen_random_uuid(),
  'Fietsparkeerplaats Keukenhof',
  'fietsparkeerplaats-keukenhof',
  'parking',
  52.2710, 4.5501,
  'Stationsweg 5, 2161 Lisse',
  'Gratis fietsparkeerplaats op loopafstand van Keukenhof en de bollenvelden.',
  'Handig startpunt voor een fietstocht door de Bollenstreek. Gratis stallen voor fietsen, toiletten aanwezig. Vertrekpunt voor de officiële Bollenstreek fietsroute.',
  null,
  null,
  null, 5,
  'public_access',
  'Gratis fietsparkeren. Geen autoparkeren hier.',
  'Heel de dag open tijdens het seizoen.',
  null,
  false, true
),

-- Pannenkoekenrestaurant de Tulp
(
  gen_random_uuid(),
  'Pannenkoekenboerderij De Tulp',
  'pannenkoekenboerderij-de-tulp',
  'food',
  52.2612, 4.5731,
  'Tulpstraat 12, 2161 Lisse',
  'Gezellige boerderijpannekoeken midden in de Bollenstreek, perfect voor een tussenstop.',
  'Authentieke pannenkoekenboerderij op een werkende bollenkwekerij. Je kunt de velden bewonderen terwijl je eet. Populair bij gezinnen. Reserveren aanbevolen in het hoogseizoen.',
  null,
  null,
  null, 2,
  'public_access',
  'Eigen parkeerplaats aanwezig (gratis voor gasten).',
  'Lunch (12:00–15:00) is het rustiger dan in de ochtend.',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  false, true
);

-- ============================================================
-- SEED DATA: routes
-- ============================================================
insert into routes (id, title, slug, description, route_type, duration_minutes, distance_km, cover_image_url, is_featured, is_active)
values
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Klassieke Bollenstreek Fietstocht',
  'klassieke-bollenstreek-fietstocht',
  'De mooiste fietstocht door het hart van de Bollenstreek langs windmolens, bollenvelden en pittoreske dorpjes. Geschikt voor het hele gezin.',
  'bike',
  150, 28.5,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  true, true
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Tulpenvelden Fotografie Route',
  'tulpenvelden-fotografie-route',
  'Speciaal samengesteld voor fotografen. Langs de beste foto-spots op het juiste moment van de dag. Inclusief tips voor instellingen en compositie.',
  'photo',
  180, 15.0,
  'https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=800',
  true, true
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Gezinsroute Noord-Holland',
  'gezinsroute-noord-holland',
  'Een rustige autoroute langs de bollenvelden van Anna Paulowna. Met stops bij boerderijen en een pannenkoekenrestaurant. Perfect voor een dagje uit met kinderen.',
  'family',
  240, 65.0,
  'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800',
  false, true
);

-- ============================================================
-- SEED DATA: route_stops
-- ============================================================

-- Stops voor: Klassieke Bollenstreek Fietstocht
insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 1
from locations where slug = 'fietsparkeerplaats-keukenhof';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 2
from locations where slug = 'bollenstreek-lisse';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 3
from locations where slug = 'windmolen-de-zwaan';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', id, 4
from locations where slug = 'pannenkoekenboerderij-de-tulp';

-- Stops voor: Tulpenvelden Fotografie Route
insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', id, 1
from locations where slug = 'windmolen-de-zwaan';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', id, 2
from locations where slug = 'bollenstreek-lisse';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', id, 3
from locations where slug = 'keukenhof';

-- Stops voor: Gezinsroute Noord-Holland
insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', id, 1
from locations where slug = 'tulpenvelden-anna-paulowna';

insert into route_stops (id, route_id, location_id, sort_order)
select gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', id, 2
from locations where slug = 'pannenkoekenboerderij-de-tulp';
