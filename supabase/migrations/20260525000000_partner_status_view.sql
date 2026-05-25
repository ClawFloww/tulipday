-- ============================================================
-- Partner Portal — view voor de hoofd-app
-- ============================================================
-- location_partner_status — per location_id de meest recente
-- partner-update (bloom of operational), zodat de hoofd-app deze
-- info in één query kan meeladen bij locations.

create view location_partner_status as
with partner_status as (
  -- Bloom-updates van partners
  select
    pl.location_id,
    'bloom'::text     as kind,
    bu.phase::text    as status,
    null::text        as crowd,
    bu.notes,
    bu.created_at     as updated_at,
    p.name            as partner_name
  from bloom_updates bu
  join partner_locations pl on pl.id = bu.partner_location_id
  join partners          p  on p.id  = pl.partner_id
  where bu.source = 'partner'
    and bu.partner_location_id is not null

  union all

  -- Operational updates (altijd partner-gegenereerd)
  select
    pl.location_id,
    'operational'::text,
    ou.status::text,
    ou.crowd_level::text,
    ou.notes,
    ou.created_at,
    p.name
  from operational_updates ou
  join partner_locations pl on pl.id = ou.partner_location_id
  join partners          p  on p.id  = pl.partner_id
)
select distinct on (location_id)
  location_id,
  kind,
  status,
  crowd,
  notes,
  updated_at,
  partner_name
from partner_status
order by location_id, updated_at desc;

grant select on location_partner_status to anon, authenticated;
