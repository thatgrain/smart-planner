-- SmartPlanner - Fase 2
-- Esegui questo file nel SQL Editor di Supabase (una sola volta).
-- La tabella contiene un unico documento JSON con tutto lo stato dell'app.

create table if not exists public.planner_state (
  id smallint primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint planner_state_single_row check (id = 1)
);

-- Necessario perché Realtime invii l'intera riga (incluso "data") negli UPDATE.
alter table public.planner_state replica identity full;

-- Allowlist: solo i due account possono leggere e scrivere il piano.
create or replace function public.is_smartplanner_user()
returns boolean
language sql
stable
security invoker
set search_path = public, auth
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'massimiliano.granello@gmail.com',
    'pietro.cargnel26@gmail.com'
  );
$$;

alter table public.planner_state enable row level security;

drop policy if exists "planner_state_select_allowed" on public.planner_state;
create policy "planner_state_select_allowed"
  on public.planner_state
  for select
  to authenticated
  using (public.is_smartplanner_user());

drop policy if exists "planner_state_insert_allowed" on public.planner_state;
create policy "planner_state_insert_allowed"
  on public.planner_state
  for insert
  to authenticated
  with check (id = 1 and public.is_smartplanner_user());

drop policy if exists "planner_state_update_allowed" on public.planner_state;
create policy "planner_state_update_allowed"
  on public.planner_state
  for update
  to authenticated
  using (id = 1 and public.is_smartplanner_user())
  with check (id = 1 and public.is_smartplanner_user());

grant select, insert, update on public.planner_state to authenticated;
grant execute on function public.is_smartplanner_user() to authenticated;

-- updated_at / updated_by automatici.
create or replace function public.touch_planner_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists planner_state_touch on public.planner_state;
create trigger planner_state_touch
before insert or update on public.planner_state
for each row execute function public.touch_planner_state();

-- Abilita Realtime sulla tabella (idempotente).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'planner_state'
  ) then
    execute 'alter publication supabase_realtime add table public.planner_state';
  end if;
end
$$;
