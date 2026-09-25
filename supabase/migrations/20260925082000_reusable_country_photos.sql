create table if not exists public.country_photos (
  country_key text primary key check (length(country_key) between 2 and 100 and country_key = lower(btrim(country_key))),
  country_name text not null,
  image_url text not null,
  source_page text not null,
  author text not null,
  license text not null,
  license_url text,
  created_at timestamptz not null default now()
);
alter table public.country_photos enable row level security;
create policy "Authenticated users may view country photos" on public.country_photos for select to authenticated using (true);
grant select on public.country_photos to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('country-photos','country-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
