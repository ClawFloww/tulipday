-- Opening hours data for horeca locations
-- Format per day: [open, close] | null (gesloten) | key absent (onbekend)
-- Midnight closing = "23:59" (00:00 = 0 min zou altijd "gesloten" tonen)

UPDATE locations SET opening_hours = '{"mon":null,"tue":["17:00","23:00"],"wed":["17:00","23:00"],"thu":["17:00","23:00"],"fri":["17:00","23:00"],"sat":null,"sun":null}'
  WHERE slug = 'brasserie-jill-s';

UPDATE locations SET opening_hours = '{"mon":["10:00","23:00"],"tue":["10:00","23:00"],"wed":["10:00","23:00"],"thu":["10:00","23:00"],"fri":["10:00","23:00"],"sat":["10:00","23:00"],"sun":["10:00","23:00"]}'
  WHERE slug = 'bar-restaurant-het-alternatief';

UPDATE locations SET opening_hours = '{"mon":null,"tue":["11:30","21:00"],"wed":["11:30","21:00"],"thu":["11:30","21:00"],"fri":["11:30","21:00"],"sat":["11:30","21:00"],"sun":["11:30","21:00"]}'
  WHERE slug = 'cafetaria-de-zilk';

UPDATE locations SET opening_hours = '{"mon":["10:00","18:00"],"tue":["10:00","18:00"],"wed":["10:00","18:00"],"thu":["10:00","18:00"],"fri":["10:00","18:00"],"sat":["10:00","18:00"],"sun":["10:00","18:00"]}'
  WHERE slug = 'como-co';

UPDATE locations SET opening_hours = '{"mon":["12:00","22:00"],"tue":["12:00","22:00"],"wed":["12:00","22:00"],"thu":["12:00","22:00"],"fri":["12:00","22:00"],"sat":["12:00","22:00"],"sun":["12:00","22:00"]}'
  WHERE slug = 'brasserie-op-dorp';

UPDATE locations SET opening_hours = '{"mon":["10:00","23:59"],"tue":["10:00","23:59"],"wed":["10:00","23:59"],"thu":["10:00","23:59"],"fri":["10:00","23:59"],"sat":["10:00","23:59"],"sun":["10:00","23:59"]}'
  WHERE slug = 'wapen-van-noordwijkerhout';

UPDATE locations SET opening_hours = '{"mon":["11:00","17:00"]}'
  WHERE slug = 'brownies-downies-noordwijkerhout';

UPDATE locations SET opening_hours = '{"mon":null,"tue":null,"wed":null,"thu":["10:00","18:00"],"fri":["10:00","18:00"],"sat":["10:00","18:00"],"sun":["10:00","18:00"]}'
  WHERE slug = 'de-ruigenhoek';

UPDATE locations SET opening_hours = '{"mon":["08:30","16:00"],"tue":["08:30","16:00"],"wed":["08:30","16:00"],"thu":["08:30","16:00"],"fri":["08:30","16:00"],"sat":null,"sun":null}'
  WHERE slug = 'lunchbreek';

UPDATE locations SET opening_hours = '{"mon":["10:00","23:59"],"tue":["10:00","23:59"],"wed":["10:00","23:59"],"thu":["10:00","23:59"],"fri":["10:00","23:59"],"sat":["10:00","23:59"],"sun":["10:00","23:59"]}'
  WHERE slug = 'cafe-restaurant-de-voogd';

UPDATE locations SET opening_hours = '{"mon":["11:00","23:59"],"tue":["11:00","23:59"],"wed":["11:00","23:59"],"thu":["11:00","23:59"],"fri":["11:00","23:59"],"sat":["11:00","23:59"],"sun":["11:00","23:59"]}'
  WHERE slug = 'eetcafe-zomerzorg';

UPDATE locations SET opening_hours = '{"mon":["10:00","17:00"],"sun":["10:00","17:00"]}'
  WHERE slug = 'barista-cafe-lisse';

UPDATE locations SET opening_hours = '{"mon":["10:00","22:00"],"tue":["10:00","22:00"],"wed":["10:00","22:00"],"thu":["10:00","22:00"],"fri":["10:00","22:00"],"sat":["10:00","22:00"],"sun":["12:00","22:00"]}'
  WHERE slug = 'brasserie-cafetaria-family-lisse';

UPDATE locations SET opening_hours = '{"mon":["10:00","23:59"],"tue":["10:00","23:59"],"wed":["10:00","23:59"],"thu":["10:00","23:59"],"fri":["10:00","23:59"],"sat":["10:00","23:59"],"sun":["10:00","23:59"]}'
  WHERE slug = 'de-heerekamer-lisse';

UPDATE locations SET opening_hours = '{"mon":null,"tue":["12:00","22:00"],"wed":["12:00","22:00"],"thu":["12:00","22:00"],"fri":["12:00","22:00"],"sat":["12:00","22:00"],"sun":["12:00","22:00"]}'
  WHERE slug = 'restaurant-de-vier-seizoenen';

UPDATE locations SET opening_hours = '{"mon":["12:00","22:00"],"tue":["12:00","22:00"],"wed":["12:00","22:00"],"thu":["12:00","22:00"],"fri":["12:00","22:00"],"sat":["12:00","22:00"],"sun":["12:00","22:00"]}'
  WHERE slug = 'ijssalon-min12';

UPDATE locations SET opening_hours = '{"mon":null,"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"],"sat":["09:00","17:00"],"sun":null}'
  WHERE slug = 'lunchroom-ons-genoegen';

UPDATE locations SET opening_hours = '{"mon":["11:00","20:00"],"tue":["11:00","20:00"],"wed":["11:00","20:00"],"thu":["11:00","20:00"],"fri":["11:00","20:00"],"sat":["11:00","20:00"],"sun":["11:00","20:00"]}'
  WHERE slug = 'pannenkoekenboerderij-de-tulp';

UPDATE locations SET opening_hours = '{"mon":null,"tue":["11:00","23:59"],"wed":["11:00","23:59"],"thu":["11:00","23:59"],"fri":["11:00","23:59"],"sat":["11:00","23:59"],"sun":["11:00","23:59"]}'
  WHERE slug = 'alexander-beach-club';

UPDATE locations SET opening_hours = '{"mon":["08:30","23:59"],"tue":["08:30","23:59"],"wed":["08:30","23:59"],"thu":["08:30","23:59"],"fri":["08:30","23:59"],"sat":["08:30","23:59"],"sun":["08:30","23:59"]}'
  WHERE slug = 'branding-beach-club';

UPDATE locations SET opening_hours = '{"mon":["09:00","23:59"],"tue":["09:00","23:59"],"wed":["09:00","23:59"],"thu":["09:00","23:59"],"fri":["09:00","23:59"],"sat":["09:00","23:59"],"sun":["09:00","23:59"]}'
  WHERE slug = 'strandclub-witsand';

UPDATE locations SET opening_hours = '{"mon":["09:00","23:59"],"tue":["09:00","23:59"],"wed":["09:00","23:59"],"thu":["09:00","23:59"],"fri":["09:00","23:59"],"sat":["09:00","23:59"],"sun":["09:00","23:59"]}'
  WHERE slug = 'tulum';

UPDATE locations SET opening_hours = '{"mon":["09:00","22:00"],"tue":["09:00","22:00"],"wed":["09:00","22:00"],"thu":["09:00","22:00"],"fri":["09:00","22:00"],"sat":["09:00","22:00"],"sun":["09:00","22:00"]}'
  WHERE slug = 'bij-de-duinen';

UPDATE locations SET opening_hours = '{"mon":["10:00","21:00"],"tue":["10:00","21:00"],"wed":["10:00","21:00"],"thu":["10:00","21:00"],"fri":["10:00","21:00"],"sat":["10:00","21:00"],"sun":["10:00","21:00"]}'
  WHERE slug = 'langs-berg-en-dal';

UPDATE locations SET opening_hours = '{"mon":null,"tue":["09:00","16:00"],"wed":["09:00","16:00"],"thu":["09:00","16:00"],"fri":["09:00","16:00"],"sat":["09:00","16:00"],"sun":null}'
  WHERE slug = 'lunchhuis-ons-thuis';

UPDATE locations SET opening_hours = '{"mon":["10:00","23:59"],"tue":["10:00","23:59"],"wed":["10:00","23:59"],"thu":["10:00","23:59"],"fri":["10:00","23:59"],"sat":["10:00","23:59"],"sun":["10:00","23:59"]}'
  WHERE slug = 'cheers-voorhout';

UPDATE locations SET opening_hours = '{"wed":["17:00","23:00"],"thu":["17:00","23:00"]}'
  WHERE slug = 't-soldaatje';

UPDATE locations SET opening_hours = '{"mon":["11:00","22:00"],"tue":["11:00","22:00"],"wed":["11:00","22:00"],"thu":["11:00","22:00"],"fri":["11:00","22:00"],"sat":["11:00","22:00"],"sun":["11:00","22:00"]}'
  WHERE slug = 'enjoy-sassenheim';

UPDATE locations SET opening_hours = '{"mon":["12:00","17:00"]}'
  WHERE slug = 'brasserie-hemels';

UPDATE locations SET opening_hours = '{"mon":null,"tue":null,"wed":["11:00","22:00"],"thu":["11:00","22:00"],"fri":["11:00","22:00"],"sat":["11:00","22:00"],"sun":["11:00","22:00"]}'
  WHERE slug = 'welgelegen-kitchen-drinks';
