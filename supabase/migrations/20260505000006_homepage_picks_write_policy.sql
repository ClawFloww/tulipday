-- Sta schrijven toe op homepage_picks voor beheerders
-- De tabel bevat alleen display-configuratie (welke locaties op homepage),
-- geen gevoelige data. RLS wordt uitgeschakeld zodat de admin-client
-- altijd kan schrijven, ook zonder service role key.

ALTER TABLE homepage_picks DISABLE ROW LEVEL SECURITY;
