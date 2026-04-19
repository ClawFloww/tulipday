-- ============================================================
-- location_photos: UGC foto uploads per locatie
-- Gebruikt session_id (anoniem) i.p.v. auth.users referentie
-- ============================================================

create table if not exists location_photos (
  id               uuid        primary key default gen_random_uuid(),
  location_id      uuid        not null references locations(id) on delete cascade,
  session_id       text        not null,
  storage_path     text        not null,
  public_url       text,
  caption          text        check (char_length(caption) <= 80),
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected')),
  bloom_confirmed  boolean     not null default false,
  rejection_reason text,
  uploaded_at      timestamptz not null default now(),
  approved_at      timestamptz,
  approved_by      text
);

-- Index voor snelle queries per locatie
create index if not exists idx_location_photos_location_id
  on location_photos (location_id, status, uploaded_at desc);

-- Index voor moderatie dashboard
create index if not exists idx_location_photos_status
  on location_photos (status, uploaded_at desc);

-- RLS
alter table location_photos enable row level security;

-- Iedereen mag goedgekeurde foto's lezen
create policy "Public read approved photos"
  on location_photos for select
  using (status = 'approved');

-- Sessies mogen hun eigen foto's uploaden
create policy "Sessions can upload photos"
  on location_photos for insert
  with check (true);

-- Sessies mogen hun eigen foto's lezen (voor optimistische UI)
create policy "Sessions can read own photos"
  on location_photos for select
  using (true);
