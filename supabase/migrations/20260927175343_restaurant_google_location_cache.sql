alter table public.restaurants
  add column if not exists google_location_obtained_at timestamptz,
  add column if not exists google_location_expires_at timestamptz,
  add column if not exists google_location_last_used_at timestamptz;

create index if not exists restaurants_provider_place_id_idx
  on public.restaurants (provider_place_id)
  where provider_place_id is not null;
