-- ============================================================
-- Partner Portal — test data
-- ============================================================
-- Handmatig draaien in de Supabase SQL Editor om twee test-partners
-- klaar te zetten. Daarna kun je via Supabase Auth (Magic Link) met
-- die mailadressen inloggen. De partner_users-koppeling wordt apart
-- gemaakt zodra je weet wat de auth.users.id is.
--
-- VOORBEREIDING
-- 1. Pas hieronder de placeholders aan:
--      <JOUW-EMAIL>         → je eigen Gmail (voor horeca-partner)
--      <JOUW-EMAIL-BOLLEN>  → bv. <jouwadres>+bollen@gmail.com
--    Gmail behandelt "+suffix" als hetzelfde inbox-adres, dus je krijgt
--    beide magic links in dezelfde inbox.
-- 2. Zorg dat er minstens twee actieve `locations` zijn (één horeca-
--    achtige en één bollenveld) en kopieer hun id's hieronder.

-- ─── 1. PARTNERS ──────────────────────────────────────────────
-- Restaurant De Tulp (horeca)
insert into partners (name, contact_email)
values ('Restaurant De Tulp', '<JOUW-EMAIL>')
returning id;

-- Bollenkwekerij Van der Velde (bollenveld)
insert into partners (name, contact_email)
values ('Bollenkwekerij Van der Velde', '<JOUW-EMAIL-BOLLEN>')
returning id;

-- ─── 2. PARTNER_LOCATIONS ─────────────────────────────────────
-- Vul deze waarden in met de id's uit stap 1 en uit de locations-tabel:
--   <PARTNER_ID_HORECA>    → uit eerste INSERT hierboven
--   <PARTNER_ID_BOLLEN>    → uit tweede INSERT hierboven
--   <LOCATION_ID_HORECA>   → bv. select id, title from locations where category = 'food' limit 1;
--   <LOCATION_ID_BOLLEN>   → bv. select id, title from locations where category = 'flower_field' limit 1;

insert into partner_locations (partner_id, location_id, category)
values
  ('<PARTNER_ID_HORECA>', '<LOCATION_ID_HORECA>', 'horeca'),
  ('<PARTNER_ID_BOLLEN>', '<LOCATION_ID_BOLLEN>', 'bollenveld');

-- ─── 3. PARTNER_USERS (na eerste magic-link login) ────────────
-- Pas nadat de partner heeft ingelogd via /partner/login is er een
-- auth.users.id beschikbaar. Koppel die hier aan de juiste partner:
--
--   select id from auth.users where email = '<JOUW-EMAIL>';
--
-- insert into partner_users (user_id, partner_id, role)
-- values
--   ('<AUTH_USER_ID_HORECA>', '<PARTNER_ID_HORECA>', 'owner'),
--   ('<AUTH_USER_ID_BOLLEN>', '<PARTNER_ID_BOLLEN>', 'owner');
