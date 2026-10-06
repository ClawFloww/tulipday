-- ============================================================
-- Anoniem account samenvoegen met een echt account
--
-- Bij inloggen (e-mailcode of Apple) krijgt de gebruiker een normaal account.
-- De gegevens van het anonieme account op dat apparaat verhuizen mee; daarna
-- verwijdert de server het anonieme account. Alleen aan te roepen door de
-- server (service role) via /api/account/merge.
-- ============================================================

create or replace function merge_anonymous_user(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from is null or p_to is null or p_from = p_to then
    return;
  end if;

  -- Dubbele opgeslagen items eerst weg, dan de rest overzetten
  delete from saved_items s
   where s.user_id = p_from
     and exists (select 1 from saved_items t
                  where t.user_id = p_to
                    and t.item_type = s.item_type
                    and t.item_id   = s.item_id);
  update saved_items     set user_id = p_to where user_id = p_from;

  update location_photos set user_id = p_to where user_id = p_from;

  -- unique (source, source_ref) blijft geldig: alleen de eigenaar verandert
  update entitlements    set user_id = p_to where user_id = p_from;
end;
$$;

revoke all on function merge_anonymous_user(uuid, uuid) from public, anon, authenticated;
grant execute on function merge_anonymous_user(uuid, uuid) to service_role;
