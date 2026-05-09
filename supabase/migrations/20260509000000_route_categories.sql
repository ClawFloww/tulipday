-- Voeg categoriekolommen toe aan routes tabel
-- activity:          Activiteitstype (Fietsroute, Wandelroute, Mountainbikeroute, E-Step Route)
-- distance_category: Afstandscategorie als array (route kan in meerdere vallen, bijv. Lang + Meerdaagse route)
-- difficulty:        Moeilijkheidsgraad
-- target_audience:   Doelgroep (array)
-- environment:       Omgeving (array, meerdere toegestaan)
-- themes:            Thema (array, meerdere toegestaan)

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS activity          text,
  ADD COLUMN IF NOT EXISTS distance_category text[],
  ADD COLUMN IF NOT EXISTS difficulty        text,
  ADD COLUMN IF NOT EXISTS target_audience   text[],
  ADD COLUMN IF NOT EXISTS environment       text[],
  ADD COLUMN IF NOT EXISTS themes            text[];

-- ── Wandelroutes ──────────────────────────────────────────────────────────────

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren','Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Bloemenwandeling Lisse (8 km)';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve wandelaars'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Bloemenwandeling Noordwijkerhout';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Kort'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren','Rolstoel/Buggy'],
  environment=ARRAY['Bos'], themes=ARRAY['Natuur']
WHERE title='Boswandeling Nieuw Leeuwenhorst';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Senioren','Gezinnen'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Heilzaam Noordwijk Route';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren'],
  environment=ARRAY['Bos'], themes=ARRAY['Historisch','Cultuur']
WHERE title='Landgoederenroute';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Kort'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren','Rolstoel/Buggy'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Langeveld Route - Hollands Duin';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren'],
  environment=ARRAY['Strand','Stad'], themes=ARRAY['Historisch','Cultuur']
WHERE title='Ontdek de omgeving van het oude zeedorp Noordwijk';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Kort'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren'],
  environment=ARRAY['Duinen','Bollenvelden'], themes=ARRAY['Natuur','Bloemen']
WHERE title='Piet Floris Route - Hollands Duin';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen','Fotogeniek']
WHERE title='Wandeling Bloemenfestival';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Middellang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden','Duinen','Strand'], themes=ARRAY['Bloemen','Culinair']
WHERE title='Wandeling langs velden, duinen, strand en terrasjes';

UPDATE routes SET activity='Wandelroute', distance_category=ARRAY['Kort'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Senioren'],
  environment=ARRAY['Strand','Duinen'], themes=ARRAY['Historisch']
WHERE title='Wandelroute Atlantikwall Noordwijk';

-- ── Mountainbikeroutes ────────────────────────────────────────────────────────

UPDATE routes SET activity='Mountainbikeroute', distance_category=ARRAY['Middellang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Mountainbike Route Noordwijk';

UPDATE routes SET activity='Mountainbikeroute', distance_category=ARRAY['Middellang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='MTB Duindamseslag Dunes';

UPDATE routes SET activity='Mountainbikeroute', distance_category=ARRAY['Kort'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='MTB Mountain Trail Singletrack';

-- ── E-Step Routes ─────────────────────────────────────────────────────────────

UPDATE routes SET activity='E-Step Route', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Dahlia Tour (E-Step)';

UPDATE routes SET activity='E-Step Route', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='E-Step Tour 2 uur (25 km)';

-- ── Fietsroutes ───────────────────────────────────────────────────────────────

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Strand','Bollenvelden'], themes=ARRAY['Bloemen','Fotogeniek']
WHERE title='Beach at Oosterduinse Meer';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Bollenstreek Flower Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Bollenvelden Hillegom – Keukenhof';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Zeer uitdagend',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Historisch','Cultuur']
WHERE title='Brederode Kasteel Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Bulb Region';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Cycling in Zandvoort';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='De Fun & Fiets Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners','Senioren'],
  environment=ARRAY['Bollenvelden','Polder'], themes=ARRAY['Cultuur','Bloemen']
WHERE title='De Valk Molen Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Duinen','Bollenvelden'], themes=ARRAY['Bloemen','Natuur']
WHERE title='Duin en Bloemroute';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen'],
  environment=ARRAY['Duinen','Bos','Bollenvelden'], themes=ARRAY['Bloemen','Natuur']
WHERE title='Duin, Bos & Tulpen Rit';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Duindamseslag – De Blink';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Duinen & Duindamseslag';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Dune Loop Zandvoort';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Enjoy the Flowers';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Familie rondje Noordwijkerhout';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Fietsen door de duinen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Polder'], themes=ARRAY['Natuur']
WHERE title='Fietsen langs de Kagerplassen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Bos','Polder'], themes=ARRAY['Historisch','Cultuur']
WHERE title='Fietsen langs kastelen en buitenplaatsen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Fietstocht door de Bollenstreek';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden','Duinen'], themes=ARRAY['Bloemen']
WHERE title='Flower Bulb Route Zandvoort';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Fotogeniek','Bloemen']
WHERE title='Fotografen Route Bollenstreek';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden','Strand'], themes=ARRAY['Culinair']
WHERE title='Gezellige Terrasjes Tour';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bos','Polder'], themes=ARRAY['Cultuur','Historisch']
WHERE title='Huis te Manpad – Oude Beek';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Bos','Bollenvelden'], themes=ARRAY['Cultuur','Bloemen']
WHERE title='Huis te Vogelenzang Estate';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Beginners','Gezinnen','Senioren'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Keukenhof – Bollenvelden Lisse';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen','Cultuur']
WHERE title='Keukenhof – St. Agatha Lisse';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Keukenhof – Tulip Display Katwijk';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Lente bloemenfietstocht';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Gezinnen','Beginners','Senioren'],
  environment=ARRAY['Bollenvelden','Polder'], themes=ARRAY['Cultuur','Historisch']
WHERE title='Max Liebermann Fietsroute';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden','Polder'], themes=ARRAY['Bloemen','Cultuur']
WHERE title='Molen – Keukenhof Bollenvelden';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Polder'], themes=ARRAY['Cultuur','Natuur']
WHERE title='Molen en Pontjes Route Kagerplassen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Nationaal Park Hollandse Duinen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Noord-Zee Kustroute Dune Trail';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Strand'], themes=ARRAY['Cultuur','Fotogeniek']
WHERE title='Noordwijk – Koningin Astrid Boulevard';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Strand','Duinen'], themes=ARRAY['Fotogeniek']
WHERE title='Noordwijk Beach – Mooie Huizen';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Noordwijk Dune Trail';

-- Pannenduin valt zowel onder 'Lang' als 'Meerdaagse route'
UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang','Meerdaagse route'], difficulty='Zeer uitdagend',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen'], themes=ARRAY['Natuur']
WHERE title='Pannenduin – Extreme Duinenroute';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Ride to Keukenhof';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Rondje door de Streek';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Cultuur']
WHERE title='Route naar Circuit Zandvoort';

-- Space Bike Tour: fietsroute langs ESA/ESTEC-ruimtevaartcentrum Noordwijk
UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Duinen','Stad'], themes=ARRAY['Cultuur']
WHERE title='Space Bike Tour';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Beginners','Gezinnen'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='The Tulperij – Bollenvelden Lisse';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Gemiddeld',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen','Fotogeniek']
WHERE title='The Tulperij – Tulip Display';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen']
WHERE title='Tripje rond de Bollenstreek';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Bollenvelden'], themes=ARRAY['Bloemen','Fotogeniek']
WHERE title='Tulpen & Hyacinten Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Middellang'], difficulty='Makkelijk',
  target_audience=ARRAY['Beginners'],
  environment=ARRAY['Bollenvelden','Polder'], themes=ARRAY['Cultuur','Historisch']
WHERE title='Van Witte Kerk naar Sint Bavo';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Cultuur']
WHERE title='Zandvoort Route';

UPDATE routes SET activity='Fietsroute', distance_category=ARRAY['Lang'], difficulty='Moeilijk',
  target_audience=ARRAY['Sportieve fietsers'],
  environment=ARRAY['Duinen','Strand'], themes=ARRAY['Natuur']
WHERE title='Zuiderduinpad Cycle Path';
