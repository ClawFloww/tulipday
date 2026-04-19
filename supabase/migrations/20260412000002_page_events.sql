-- Analytics: anonymous event stream (no PII)
create table if not exists page_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  event_name  text not null,
  properties  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- Index for querying popular locations and event counts
create index if not exists page_events_event_name_idx  on page_events (event_name);
create index if not exists page_events_created_at_idx  on page_events (created_at desc);
create index if not exists page_events_location_id_idx on page_events ((properties->>'location_id'));

-- RLS: anyone can insert, only service-role can read
alter table page_events enable row level security;

create policy "Public insert"
  on page_events for insert to anon, authenticated
  with check (true);

-- Service-role reads all rows (admin queries)
create policy "Service read"
  on page_events for select to service_role
  using (true);
