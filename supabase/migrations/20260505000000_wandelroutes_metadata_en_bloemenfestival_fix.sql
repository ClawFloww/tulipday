-- Correcties wandelroutes:
-- 1. Juiste afstanden en looptijden o.b.v. GPX-meting en PDF
-- 2. Wandeling Bloemenfestival: juiste geometry (bloemenwandeling-nwh-1e-deel.gpx,
--    knooppunten 78-55-46-72-70-69-26-68, 12,9 km) i.p.v. verkeerde GPX (knooppunt 49)
-- 3. Titel Piet Floris Route gecorrigeerd
-- 4. Nieuwe route: Wandeling langs velden, duinen, strand en terrasjes (14,5 km)
--    geometry uit Wandeling Bloemenfestival.gpx (knooppunt 49, 14,54 km)

-- ── 1. Afstanden en looptijden ────────────────────────────────────────────────

UPDATE routes SET
  distance_km       = 10.75,
  duration_minutes  = 161
WHERE slug = 'ontdek-omgeving-zeedorp-noordwijk';

UPDATE routes SET
  distance_km       = 18.0,
  duration_minutes  = 240
WHERE slug = 'bloemenwandeling-noordwijkerhout';

UPDATE routes SET
  distance_km       = 1.9,
  duration_minutes  = 30
WHERE slug = 'boswandeling-nieuw-leeuwenhorst';

UPDATE routes SET
  distance_km       = 9.0,
  duration_minutes  = 108
WHERE slug = 'heilzaam-noordwijk-route';

UPDATE routes SET
  distance_km       = 9.2,
  duration_minutes  = 110
WHERE slug = 'landgoederenroute';

UPDATE routes SET
  title             = 'Piet Floris Route - Hollands Duin',
  distance_km       = 4.2,
  duration_minutes  = 60
WHERE slug = 'piet-floris-route-hollands-duin';

UPDATE routes SET
  distance_km       = 3.6,
  duration_minutes  = 60
WHERE slug = 'atlantikwall-route';

-- ── 2. Wandeling Bloemenfestival: juiste geometry + afstand ───────────────────
-- Correcte bron: bloemenwandeling-nwh-1e-deel.gpx
-- Knooppunten: 78 → 55 → 46 → 72 → 70 → 69 → 26 → 68 (lus, 12,9 km)

UPDATE routes SET
  distance_km      = 12.9,
  duration_minutes = 195,
  geometry_points  = '[[52.26247,4.49259],[52.26278,4.49296],[52.26313,4.49326],[52.26349,4.49349],[52.26366,4.4935],[52.26791,4.49404],[52.26829,4.49418],[52.26821,4.49468],[52.26898,4.49472],[52.26927,4.49479],[52.26968,4.49498],[52.26991,4.49518],[52.27047,4.49545],[52.27092,4.49572],[52.27131,4.49586],[52.27147,4.49597],[52.27187,4.49641],[52.27218,4.49658],[52.27241,4.49683],[52.2727,4.49691],[52.27317,4.49735],[52.27342,4.49756],[52.27549,4.49898],[52.27572,4.49921],[52.27631,4.50007],[52.27678,4.50024],[52.27701,4.50016],[52.27712,4.5002],[52.27754,4.50066],[52.27777,4.50114],[52.27798,4.50101],[52.27836,4.50073],[52.27864,4.50087],[52.27881,4.50086],[52.27914,4.50153],[52.27953,4.50189],[52.28015,4.50228],[52.28091,4.5027],[52.28205,4.50408],[52.28267,4.50467],[52.28292,4.50556],[52.28342,4.50582],[52.28457,4.50744],[52.28639,4.50955],[52.28666,4.50969],[52.28528,4.51469],[52.28508,4.51545],[52.28473,4.51711],[52.2837,4.51755],[52.28441,4.51844],[52.28386,4.51987],[52.28247,4.52126],[52.28234,4.52536],[52.28044,4.5294],[52.27797,4.53422],[52.27765,4.53566],[52.27785,4.53617],[52.27985,4.53502],[52.29023,4.52883],[52.29134,4.52649],[52.29138,4.52331],[52.28666,4.52027],[52.28484,4.51884],[52.28199,4.516],[52.28029,4.5146],[52.2761,4.5102],[52.27237,4.50533],[52.27125,4.5034],[52.2702,4.50214],[52.26984,4.50427],[52.26814,4.50237],[52.26731,4.50214],[52.2659,4.50263],[52.26512,4.50392],[52.26364,4.5052],[52.26182,4.50518],[52.26076,4.49927],[52.26091,4.4978],[52.26182,4.49491],[52.26234,4.49245]]'
WHERE slug = 'wandeling-bloemenfestival';

-- ── 3. Nieuwe route: Wandeling langs velden, duinen, strand en terrasjes ──────
-- Bron: Wandeling Bloemenfestival.gpx (knooppunt 49, 14,54 km)
-- PDF: Wandeling-langs-velden-duinen-strand-en-terrasjes (14,5 km, start Noordwijkerhout)

INSERT INTO routes (
  id, title, slug, description, route_type,
  distance_km, duration_minutes, is_active, is_featured, attribution,
  geometry_points
) VALUES (
  gen_random_uuid(),
  'Wandeling langs velden, duinen, strand en terrasjes',
  'wandeling-langs-velden-duinen-strand',
  'Wandeling vanuit Noordwijkerhout langs de bollenvelden, door duinen en over strand. Langs de gezellige terrassen van deze streek. De route loopt langs Pannenkoekenboerderij Langs Berg en Dal, strandplaats Nederzandt en strandpaviljoen De Zeespiegel.',
  'walk',
  14.5, 180, true, false, null,
  '[[52.26283,4.49305],[52.26248,4.49214],[52.26286,4.49059],[52.26284,4.48996],[52.26305,4.48854],[52.26321,4.48729],[52.26397,4.48478],[52.2644,4.48316],[52.26447,4.48247],[52.26507,4.48322],[52.26526,4.48332],[52.26585,4.48236],[52.26648,4.48315],[52.26669,4.48278],[52.26738,4.48365],[52.26892,4.48121],[52.26943,4.48025],[52.27126,4.47743],[52.27256,4.47958],[52.27296,4.48088],[52.2733,4.48198],[52.27367,4.48296],[52.27466,4.48467],[52.27812,4.49102],[52.27992,4.49418],[52.2799,4.49421],[52.28006,4.49361],[52.28079,4.48963],[52.28119,4.48819],[52.28169,4.48709],[52.28239,4.48679],[52.28356,4.48525],[52.28343,4.48499],[52.28354,4.48411],[52.28385,4.48311],[52.28403,4.48264],[52.28536,4.48023],[52.28625,4.47728],[52.28666,4.47657],[52.28713,4.4751],[52.28739,4.47396],[52.28791,4.47326],[52.28831,4.47268],[52.28873,4.4728],[52.28921,4.47316],[52.28978,4.47333],[52.291,4.47379],[52.29137,4.47391],[52.29174,4.47384],[52.29301,4.47351],[52.29378,4.47384],[52.29509,4.47375],[52.29715,4.47437],[52.29881,4.47574],[52.29971,4.47685],[52.30168,4.47825],[52.30222,4.47531],[52.30155,4.47471],[52.29053,4.46626],[52.2862,4.46272],[52.28269,4.46],[52.27858,4.45669],[52.27816,4.45774],[52.27783,4.46],[52.27761,4.46082],[52.27645,4.46286],[52.27405,4.46664],[52.27309,4.4679],[52.27222,4.46821],[52.2722,4.46785],[52.27221,4.46713],[52.27152,4.46568],[52.27073,4.46471],[52.26944,4.46461],[52.26996,4.46617],[52.26997,4.46685],[52.26861,4.469],[52.2697,4.47489],[52.27124,4.47747],[52.26902,4.48095],[52.26821,4.48236],[52.26679,4.48278],[52.26663,4.48292],[52.26679,4.48398],[52.2661,4.48531],[52.26529,4.48689],[52.26495,4.48709],[52.26405,4.4915],[52.26383,4.49186],[52.26371,4.49328],[52.26283,4.49305]]'
) ON CONFLICT (slug) DO NOTHING;
