create table if not exists public.user_place_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  city text,
  country text not null default 'Japan',
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  coordinate_source text not null default 'osm' check (coordinate_source in ('osm','manual')),
  coordinate_source_id text,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  trip_id bigint references public.trips(id) on delete set null,
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);
alter table public.user_place_submissions enable row level security;
drop policy if exists "Users can read own pin submissions" on public.user_place_submissions;
create policy "Users can read own pin submissions" on public.user_place_submissions for select to authenticated using (created_by = auth.uid() or is_admin());
drop policy if exists "Users can submit own pins" on public.user_place_submissions;
create policy "Users can submit own pins" on public.user_place_submissions for insert to authenticated with check (created_by = auth.uid() and status = 'pending_review');
drop policy if exists "Admins can review pin submissions" on public.user_place_submissions;
create policy "Admins can review pin submissions" on public.user_place_submissions for update to authenticated using (is_admin()) with check (is_admin());
