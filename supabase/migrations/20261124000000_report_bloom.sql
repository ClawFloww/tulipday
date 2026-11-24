-- ============================================================
-- Bloei melden door gebruikers (navigatie, locatiepagina)
-- ============================================================
-- De app mag `locations` niet zelf bijwerken (RLS: alleen lezen). Deze
-- functie doet dat gecontroleerd:
--   • alleen de vier statussen van locations.bloom_status
--   • alleen actieve bollenvelden
--   • alleen ingelogde gebruikers (ook anonieme app-accounts)
--   • max. 1 melding per veld per 10 minuten per gebruiker en
--     max. 30 meldingen per uur per gebruiker
-- Elke melding komt ook in bloom_updates (source = 'user') als geschiedenis.

create or replace function public.report_bloom(p_location_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_phase bloom_phase;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_phase := case p_status
    when 'early'    then 'first_buds'::bloom_phase
    when 'blooming' then 'starting'::bloom_phase
    when 'peak'     then 'peak'::bloom_phase
    when 'ending'   then 'fading'::bloom_phase
  end;
  if v_phase is null then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if not exists (
    select 1 from locations
    where id = p_location_id and is_active and category = 'flower_field'
  ) then
    raise exception 'unknown_location' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from bloom_updates
    where source = 'user' and created_by = v_user and location_id = p_location_id
      and created_at > now() - interval '10 minutes'
  ) or (
    select count(*) from bloom_updates
    where source = 'user' and created_by = v_user
      and created_at > now() - interval '1 hour'
  ) >= 30 then
    return 'too_often';
  end if;

  insert into bloom_updates (location_id, phase, source, created_by)
  values (p_location_id, v_phase, 'user', v_user);

  update locations set bloom_status = p_status where id = p_location_id;
  return 'ok';
end;
$$;

revoke all on function public.report_bloom(uuid, text) from public, anon;
grant execute on function public.report_bloom(uuid, text) to authenticated;
