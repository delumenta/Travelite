create policy "Public can read curated planning profiles"
on public.place_planning_profiles
for select
to anon, authenticated
using (curation_status = 'curated');

create policy "Public can read windows for curated places"
on public.place_time_windows
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.place_planning_profiles pp
    where pp.place_id = place_time_windows.place_id
      and pp.curation_status = 'curated'
  )
);

create policy "Public can read active day trip suggestions"
on public.day_trip_suggestions
for select
to anon, authenticated
using (active = true);
