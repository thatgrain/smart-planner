-- SmartPlanner - Fase 4b: filtro per tipo di evento nei feed ICS personali
-- Esegui questo file dopo 0002_feed_tokens.sql.
-- I flag valgono per i calendari personali (feed 'A' e 'B').
-- Il feed 'room' contiene solo le notti: i flag sono presenti ma ignorati.

alter table public.feed_tokens
  add column if not exists include_office  boolean not null default true,
  add column if not exists include_smart   boolean not null default true,
  add column if not exists include_absences boolean not null default true,
  add column if not exists include_holidays boolean not null default false;

-- Le policy RLS e i grant su public.feed_tokens coprono già le nuove colonne.
