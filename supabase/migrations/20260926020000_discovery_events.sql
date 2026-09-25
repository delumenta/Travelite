-- Travelite discovery analytics
-- Stores interaction signals without persisting precise device coordinates.

create table if not exists public.discovery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id bigint references public.trips(id) on delete set null,
  session_id uuid,
  event_type text not null,
  entity_kind text check (entity_kind in ('place','food')),
  entity_id bigint,
  provider text check (provider in ('travelite','google')),
  provider_place_id text,
  context text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists discovery_events_created_at_idx
  on public.discovery_events (created_at desc);

create index if not exists discovery_events_entity_idx
  on public.discovery_events (entity_kind, entity_id)
  where entity_id is not null;

create index if not exists discovery_events_provider_place_idx
  on public.discovery_events (provider, provider_place_id)
  where provider_place_id is not null;

create index if not exists discovery_events_trip_idx
  on public.discovery_events (trip_id, created_at desc)
  where trip_id is not null;

alter table public.discovery_events enable row level security;

revoke all on table public.discovery_events from anon, authenticated;
grant insert on table public.discovery_events to authenticated;

drop policy if exists "Users can record own discovery events" on public.discovery_events;
create policy "Users can record own discovery events"
on public.discovery_events
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    trip_id is null
    or public.is_trip_owner(trip_id)
    or public.is_trip_member(trip_id)
  )
);

comment on table public.discovery_events is
  'Privacy-conscious Travelite interaction analytics. Precise device coordinates are intentionally not stored.';
