-- Verwijder routes zonder bronbestand
DELETE FROM routes WHERE slug IN (
  'gezinsroute-bollenstreek',
  'gezinsroute-noord-holland',
  'keukenhof-fietsroute-blauw',
  'keukenhof-fietsroute-groen',
  'keukenhof-fietsroute-paars',
  'keukenhof-fietsroute-rood',
  'klassieke-bollenstreek-fietstocht',
  'noordwijkerhout-flower-walk',
  'tulip-bike-tour-10km',
  'tulip-cycle-tour',
  'tulpenvelden-fotografie-route'
);
