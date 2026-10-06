-- ============================================================
-- Accounts & premium op de server
--
-- Iedere gebruiker krijgt bij de eerste start een anoniem Supabase-account
-- (Authentication → Sign In / Providers → "Allow anonymous sign-ins" moet aan).
-- Persoonlijke data hangt voortaan aan auth.uid() in plaats van aan de
-- willekeurige session_id uit localStorage.
--
-- Voer deze migratie uit vóórdat de bijbehorende code live gaat.
-- ============================================================


-- ── 1. saved_items: eigenaar = auth-gebruiker ───────────────────────────────

alter table saved_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table saved_items alter column user_id set default auth.uid();

create index if not exists saved_items_user_id_idx on saved_items (user_id);

-- Eventuele policies die ooit via het dashboard zijn aangemaakt staan niet in
-- de repo en kunnen te ruim zijn. We vervangen ze allemaal door eigen-rij-policies.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'saved_items'
  loop
    execute format('drop policy %I on saved_items', p.policyname);
  end loop;
end $$;

create policy "saved_items_select_own" on saved_items
  for select to authenticated using (user_id = auth.uid());

create policy "saved_items_insert_own" on saved_items
  for insert to authenticated with check (user_id = auth.uid());

create policy "saved_items_delete_own" on saved_items
  for delete to authenticated using (user_id = auth.uid());


-- ── 2. location_photos: koppel nieuwe uploads aan de gebruiker ──────────────
-- Bestaande policies blijven ongemoeid; we leggen alleen het eigenaarschap vast
-- zodat foto's meeverhuizen bij inloggen en verdwijnen bij accountverwijdering.

alter table location_photos
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table location_photos alter column user_id set default auth.uid();


-- ── 3. entitlements: wie heeft premium, voor welk seizoen ───────────────────
-- Alleen de server (service role via betaal-webhooks) schrijft hierin.

create table if not exists entitlements (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  product     text        not null default 'season_pass',
  season      int         not null,
  source      text        not null check (source in ('stripe', 'apple', 'google', 'legacy', 'manual')),
  source_ref  text        not null,   -- Stripe checkout-sessie, store-transactie, ...
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,            -- terugbetaling / chargeback
  unique (source, source_ref)
);

create index if not exists entitlements_user_id_idx on entitlements (user_id);

alter table entitlements enable row level security;

create policy "entitlements_select_own" on entitlements
  for select to authenticated using (user_id = auth.uid());


-- ── 4. Oude session_id-data overzetten naar het account ─────────────────────
-- Wordt één keer per apparaat aangeroepen na de eerste (anonieme) login.
-- De session_id is een willekeurige UUID die alleen op dat apparaat bekend is.

create or replace function claim_legacy_session(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_session_id is null or length(p_session_id) < 32 then
    return;
  end if;

  update saved_items
     set user_id = uid
   where session_id = p_session_id and user_id is null;

  update location_photos
     set user_id = uid
   where session_id = p_session_id and user_id is null;

  -- premium_purchases is ooit buiten de migraties om aangemaakt (Stripe-webhook)
  if to_regclass('public.premium_purchases') is not null then
    execute $q$
      insert into entitlements (user_id, product, season, source, source_ref, granted_at)
      select $1, 'season_pass', extract(year from purchased_at)::int, 'legacy', stripe_session_id, purchased_at
        from premium_purchases
       where session_id = $2 and stripe_session_id is not null
      on conflict (source, source_ref) do nothing
    $q$ using uid, p_session_id;
  end if;
end;
$$;

revoke all on function claim_legacy_session(text) from public, anon;
grant execute on function claim_legacy_session(text) to authenticated;
