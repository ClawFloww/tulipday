-- Verwijder wandelroutes zonder bronbestand (geen GPX of PDF beschikbaar)
DELETE FROM routes WHERE slug IN (
  'duin-kunstroute-staatsbosbeheer',
  'wandeling-noordwijkerhout-langevelderslag'
);
