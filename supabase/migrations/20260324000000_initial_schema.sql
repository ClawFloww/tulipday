-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: locations
-- ============================================================
create table if not exists locations (
  id                uuid        primary key default gen_random_uuid(),
  title             text        not null,
  slug              text        unique,
  category          text,       -- flower_field, photo_spot, attraction, food, parking
  latitude          float8,
  longitude         float8,
  address           text,
  short_description text,
  full_description  text,
  flower_type       text,
  bloom_status      text,       -- early, blooming, peak, ending
  photo_score       int2,       -- 1 to 5
  crowd_score       int2,       -- 1 to 5
  access_type       text,       -- roadside_only, public_access, private_view_only
  parking_info      text,
  best_visit_time   text,
  image_url         text,
  is_featured       bool        not null default false,
  is_active         bool        not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

-- ============================================================
-- TABLE: routes
-- ============================================================
create table if not exists routes (
  id               uuid        primary key default gen_random_uuid(),
  title            text,
  slug             text        unique,
  description      text,
  route_type       text,       -- car, bike, walk, family, photo
  duration_minutes int4,
  distance_km      float4,
  cover_image_url  text,
  is_featured      bool        not null default false,
  is_active        bool        not null default true,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE: route_stops
-- ============================================================
create table if not exists route_stops (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid references routes(id)    on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  sort_order  int4
);

-- ============================================================
-- TABLE: saved_items
-- ============================================================
create table if not exists saved_items (
  id         uuid        primary key default gen_random_uuid(),
  session_id text,               -- no login required for MVP
  item_type  text,               -- 'location' or 'route'
  item_id    uuid,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (read-only public access)
-- ============================================================
alter table locations   enable row level security;
alter table routes      enable row level security;
alter table route_stops enable row level security;
alter table saved_items enable row level security;

-- locations: anyone can read active rows
create policy "public_read_locations"
  on locations for select
  using (is_active = true);

-- routes: anyone can read active rows
create policy "public_read_routes"
  on routes for select
  using (is_active = true);

-- route_stops: anyone can read
create policy "public_read_route_stops"
  on route_stops for select
  using (true);

-- saved_items: session owner can read/insert/delete
create policy "session_read_saved"
  on saved_items for select
  using (true);

create policy "session_insert_saved"
  on saved_items for insert
  with check (true);

create policy "session_delete_saved"
  on saved_items for delete
  using (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_locations_category    on locations(category);
create index if not exists idx_locations_bloom_status on locations(bloom_status);
create index if not exists idx_locations_is_featured  on locations(is_featured) where is_featured = true;
create index if not exists idx_routes_route_type      on routes(route_type);
create index if not exists idx_route_stops_route_id   on route_stops(route_id);
create index if not exists idx_saved_items_session    on saved_items(session_id);
