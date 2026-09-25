alter table public.places
  add column if not exists google_enrichment_status text not null default 'pending',
  add column if not exists google_enrichment_attempts integer not null default 0,
  add column if not exists google_enriched_at timestamptz;

alter table public.places
  drop constraint if exists places_google_enrichment_status_check;

alter table public.places
  add constraint places_google_enrichment_status_check
  check (google_enrichment_status in ('pending','done','failed'));

create index if not exists places_google_enrichment_queue_idx
  on public.places (google_enrichment_status, google_enrichment_attempts, id);

update public.places
set google_enrichment_status = 'pending',
    google_enrichment_attempts = 0,
    google_enriched_at = null
where status = 'active';