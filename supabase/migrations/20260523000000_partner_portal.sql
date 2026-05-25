-- ============================================================
-- Partner Portal — sprint 1
-- ============================================================
-- Tabellen, enums en views voor B2B-partners (horeca, fietsverhuur,
-- attracties, bollentelers, ...) die hun operationele of bloeistatus
-- kunnen bijwerken. RLS strikt: een partner ziet en wijzigt enkel
-- eigen data; publieke views ontsluiten alleen de huidige status voor
-- de hoofd-app.

-- ============================================================
-- ENUMS
-- ============================================================

create type partner_category as enum (
  'horeca',
  'fietsverhuur',
  'attractie',
  'recreatiepark',
  'accommodatie',
  'bollenveld',
  'evenement'
);

create type operational_status as enum (
  'open',
  'closing_soon',
  'closed'
);

create type crowd_level as enum (
  'quiet',
  'normal',
  'busy',
  'full'
);

create type bloom_phase as enum (
  'not_yet',
  'first_buds',
  'starting',
  'peak',
  'fading'
);

-- ============================================================
-- TABLES
-- ============================================================

create table partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text not null,
  contact_phone text,
  kvk_number    text,
  tier          text not null default 'free' check (tier in ('free', 'featured', 'premium')),
  active        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_partners_email on partners(contact_email);

create table partner_locations (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partners(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  category    partner_category not null,
  created_at  timestamptz default now(),
  unique(partner_id, location_id)
);

create index idx_partner_locations_partner  on partner_locations(partner_id);
create index idx_partner_locations_location on partner_locations(location_id);

create table partner_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'editor')),
  created_at timestamptz default now(),
  unique(user_id, partner_id)
);

create index idx_partner_users_user    on partner_users(user_id);
create index idx_partner_users_partner on partner_users(partner_id);

create table operational_updates (
  id                  uuid primary key default gen_random_uuid(),
  partner_location_id uuid not null references partner_locations(id) on delete cascade,
  status              operational_status not null,
  crowd_level         crowd_level,
  notes               text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz default now()
);

create index idx_operational_updates_location on operational_updates(partner_location_id, created_at desc);

create table bloom_updates (
  id                  uuid primary key default gen_random_uuid(),
  partner_location_id uuid references partner_locations(id) on delete cascade,
  location_id         uuid not null references locations(id) on delete cascade,
  phase               bloom_phase not null,
  notes               text,
  source              text not null default 'partner' check (source in ('partner', 'user', 'admin')),
  created_by          uuid references auth.users(id),
  created_at          timestamptz default now()
);

create index idx_bloom_updates_location on bloom_updates(location_id, created_at desc);

-- ============================================================
-- VIEWS — huidige status per locatie
-- ============================================================

create view current_operational_status as
select distinct on (partner_location_id)
  partner_location_id,
  status,
  crowd_level,
  notes,
  created_at as updated_at
from operational_updates
order by partner_location_id, created_at desc;

create view current_bloom_status as
select distinct on (location_id)
  location_id,
  phase,
  notes,
  source,
  created_at as updated_at
from bloom_updates
order by location_id, created_at desc;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table partners            enable row level security;
alter table partner_locations   enable row level security;
alter table partner_users       enable row level security;
alter table operational_updates enable row level security;
alter table bloom_updates       enable row level security;

-- Partners — lees eigen record
create policy "partners_read_own"
on partners for select
to authenticated
using (
  id in (
    select partner_id from partner_users where user_id = auth.uid()
  )
);

-- Partner locations — lees eigen koppelingen
create policy "partner_locations_read_own"
on partner_locations for select
to authenticated
using (
  partner_id in (
    select partner_id from partner_users where user_id = auth.uid()
  )
);

-- Partner users — lees eigen rij
create policy "partner_users_read_own"
on partner_users for select
to authenticated
using (user_id = auth.uid());

-- Operational updates — insert/read alleen voor eigen partner_locations
create policy "operational_updates_insert_own"
on operational_updates for insert
to authenticated
with check (
  partner_location_id in (
    select pl.id
    from partner_locations pl
    join partner_users pu on pu.partner_id = pl.partner_id
    where pu.user_id = auth.uid()
  )
);

create policy "operational_updates_read_own"
on operational_updates for select
to authenticated
using (
  partner_location_id in (
    select pl.id
    from partner_locations pl
    join partner_users pu on pu.partner_id = pl.partner_id
    where pu.user_id = auth.uid()
  )
);

-- Bloom updates — insert/read alleen voor eigen partner_locations
create policy "bloom_updates_insert_own"
on bloom_updates for insert
to authenticated
with check (
  partner_location_id in (
    select pl.id
    from partner_locations pl
    join partner_users pu on pu.partner_id = pl.partner_id
    where pu.user_id = auth.uid()
  )
);

create policy "bloom_updates_read_own"
on bloom_updates for select
to authenticated
using (
  partner_location_id in (
    select pl.id
    from partner_locations pl
    join partner_users pu on pu.partner_id = pl.partner_id
    where pu.user_id = auth.uid()
  )
);

-- Publieke views voor de hoofd-app (status zonder gevoelige partner-data)
grant select on current_operational_status to anon, authenticated;
grant select on current_bloom_status       to anon, authenticated;

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger partners_updated_at
before update on partners
for each row execute function update_updated_at();
