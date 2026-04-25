-- Opening hours for attraction locations
-- Uses title matching since slugs may vary (created via admin panel)

-- Keukenhof: dagelijks 08:00-19:00
UPDATE locations SET opening_hours = '{"mon":["08:00","19:00"],"tue":["08:00","19:00"],"wed":["08:00","19:00"],"thu":["08:00","19:00"],"fri":["08:00","19:00"],"sat":["08:00","19:00"],"sun":["08:00","19:00"]}'
  WHERE slug = 'keukenhof';

-- Tulip Experience Amsterdam: dagelijks 08:00-18:00, vr/zo tot 19:00, za tot 21:00
UPDATE locations SET opening_hours = '{"mon":["08:00","18:00"],"tue":["08:00","18:00"],"wed":["08:00","18:00"],"thu":["08:00","18:00"],"fri":["08:00","19:00"],"sat":["08:00","21:00"],"sun":["08:00","19:00"]}'
  WHERE title ILIKE '%Tulip Experience%';

-- JUB Holland: ma t/m vr 08:00-17:00, za/zo gesloten
UPDATE locations SET opening_hours = '{"mon":["08:00","17:00"],"tue":["08:00","17:00"],"wed":["08:00","17:00"],"thu":["08:00","17:00"],"fri":["08:00","17:00"],"sat":null,"sun":null}'
  WHERE title ILIKE '%JUB Holland%';

-- Museum De Zwarte Tulp: di t/m zo 10:30-17:00, ma gesloten
UPDATE locations SET opening_hours = '{"mon":null,"tue":["10:30","17:00"],"wed":["10:30","17:00"],"thu":["10:30","17:00"],"fri":["10:30","17:00"],"sat":["10:30","17:00"],"sun":["10:30","17:00"]}'
  WHERE title ILIKE '%Zwarte Tulp%';

-- LAM Museum: wo, vr, za, zo 10:00-17:00
UPDATE locations SET opening_hours = '{"mon":null,"tue":null,"wed":["10:00","17:00"],"thu":null,"fri":["10:00","17:00"],"sat":["10:00","17:00"],"sun":["10:00","17:00"]}'
  WHERE title ILIKE '%LAM%' AND category = 'attraction';

-- Kasteel Keukenhof: landgoed dagelijks 08:00-19:30
UPDATE locations SET opening_hours = '{"mon":["08:00","19:30"],"tue":["08:00","19:30"],"wed":["08:00","19:30"],"thu":["08:00","19:30"],"fri":["08:00","19:30"],"sat":["08:00","19:30"],"sun":["08:00","19:30"]}'
  WHERE title ILIKE '%Kasteel Keukenhof%';

-- Ruïne van Teylingen: za & zo 11:00-17:00
UPDATE locations SET opening_hours = '{"mon":null,"tue":null,"wed":null,"thu":null,"fri":null,"sat":["11:00","17:00"],"sun":["11:00","17:00"]}'
  WHERE title ILIKE '%Teylingen%' AND category = 'attraction';

-- Bloemenmozaïeken en Bloemencorso: evenementen, geen vaste openingstijden → overslaan
