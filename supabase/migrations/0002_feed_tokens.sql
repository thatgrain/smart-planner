-- SmartPlanner - Fase 4: feed ICS in abbonamento
-- Esegui questo file dopo 0001_init.sql.
-- I token sono segreti: chi conosce l'URL del feed può leggere il calendario.

create table if not exists public.feed_tokens (
  feed text primary key check (feed in ('A', 'B', 'room')),
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.feed_tokens enable row level security;

drop policy if exists "feed_tokens_select_allowed" on public.feed_tokens;
create policy "feed_tokens_select_allowed"
  on public.feed_tokens
  for select
  to authenticated
  using (public.is_smartplanner_user());

drop policy if exists "feed_tokens_insert_allowed" on public.feed_tokens;
create policy "feed_tokens_insert_allowed"
  on public.feed_tokens
  for insert
  to authenticated
  with check (public.is_smartplanner_user());

drop policy if exists "feed_tokens_update_allowed" on public.feed_tokens;
create policy "feed_tokens_update_allowed"
  on public.feed_tokens
  for update
  to authenticated
  using (public.is_smartplanner_user())
  with check (public.is_smartplanner_user());

grant select, insert, update on public.feed_tokens to authenticated;

-- Token iniziali (64 caratteri esadecimali). Se esistono già, non vengono toccati.
insert into public.feed_tokens (feed, token)
values
  ('A', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ('B', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ('room', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (feed) do nothing;
