alter table public.places
  add column if not exists image_status text not null default 'pending',
  add column if not exists image_match_method text,
  add column if not exists image_review_reason text,
  add column if not exists image_checked_at timestamptz,
  add column if not exists image_candidate_url text,
  add column if not exists image_candidate_source_url text,
  add column if not exists image_candidate_author text,
  add column if not exists image_candidate_license text,
  add column if not exists image_candidate_license_url text;

alter table public.places
  drop constraint if exists places_image_status_check;

alter table public.places
  add constraint places_image_status_check
  check (image_status in ('pending','stored','review','missing','failed'));

create index if not exists places_image_queue_idx on public.places (image_status, id);

update public.places
set image_url=null,image_source_url=null,image_author=null,image_license=null,image_license_url=null,
    image_candidate_url=null,image_candidate_source_url=null,image_candidate_author=null,
    image_candidate_license=null,image_candidate_license_url=null,
    image_status='pending',image_match_method=null,image_review_reason=null,image_checked_at=null
where status='active';