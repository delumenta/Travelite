-- Separate catalogue structure from each traveller's preference.
alter table public.places
  add column if not exists is_anchor boolean not null default false,
  add column if not exists anchor_type text not null default 'supporting';

alter table public.places
  drop constraint if exists places_anchor_type_check;
alter table public.places
  add constraint places_anchor_type_check
  check (anchor_type in ('attraction','food_shopping','activity','supporting','day_trip'));

-- Seed only from the reviewed planning catalogue, never infer anchor status
-- from a user's personal priority.
update public.places p
set is_anchor = coalesce(q.anchor_place,false),
    anchor_type = case
      when coalesce(q.anchor_place,false) and p.place_type in ('market','shopping_district','shopping_street') then 'food_shopping'
      when coalesce(q.anchor_place,false) and p.place_type in ('activity','experience','theme_park') then 'activity'
      when coalesce(q.anchor_place,false) then 'attraction'
      else 'supporting'
    end
from public.place_planning_profiles q
where q.place_id=p.id;

alter table public.place_planning_profiles
  add column if not exists estimated_duration_min integer,
  add column if not exists estimated_duration_max integer,
  add column if not exists best_time_notes text;
update public.place_planning_profiles q
set estimated_duration_min=coalesce(q.estimated_duration_min,p.estimated_minutes_min,q.minimum_useful_time_min),
    estimated_duration_max=coalesce(q.estimated_duration_max,p.estimated_minutes_max,q.typical_duration_min),
    best_time_notes=coalesce(q.best_time_notes,p.timing_intelligence->>'best_time_notes')
from public.places p where p.id=q.place_id;

-- Preferences belong to a trip item/submission, not the public catalogue row.
alter table public.trip_places
  add column if not exists user_priority text not null default 'optional',
  add column if not exists priority_source text not null default 'user',
  add constraint trip_places_user_priority_check check (user_priority in ('fixed','optional')),
  add constraint trip_places_priority_source_check check (priority_source in ('user','catalog','inferred'));

alter table public.user_place_submissions
  add column if not exists user_priority text not null default 'optional',
  add column if not exists priority_source text not null default 'user',
  add column if not exists is_unverified boolean not null default true,
  add constraint user_place_submissions_priority_check check (user_priority in ('fixed','optional')),
  add constraint user_place_submissions_priority_source_check check (priority_source in ('user','catalog','inferred'));
drop policy if exists "Users can update priority on own pins" on public.user_place_submissions;
create policy "Users can update priority on own pins" on public.user_place_submissions
  for update to authenticated using (created_by=auth.uid() and status='pending_review')
  with check (created_by=auth.uid() and status='pending_review');

alter table public.schedule
  add column if not exists user_priority text not null default 'optional',
  add column if not exists priority_source text not null default 'user',
  add column if not exists is_unverified boolean not null default false,
  add column if not exists user_submission_id uuid references public.user_place_submissions(id) on delete set null,
  add constraint schedule_user_priority_check check (user_priority in ('fixed','optional')),
  add constraint schedule_priority_source_check check (priority_source in ('user','catalog','inferred'));
create index if not exists schedule_user_submission_id_idx on public.schedule(user_submission_id) where user_submission_id is not null;

comment on column public.places.is_anchor is 'Curated structural role for day-card planning; independent of a traveller priority.';
comment on column public.trip_places.user_priority is 'This trip user’s choice: fixed (Must go) or optional.';
comment on column public.schedule.user_priority is 'This trip user’s choice: fixed (Must go) or optional.';
