-- Keep raw discovery events private to the signed-in user and rely on Trips RLS
-- for trip-access validation rather than calling public SECURITY DEFINER helpers.

drop policy if exists "Users can record own discovery events" on public.discovery_events;

create policy "Users can record own discovery events"
on public.discovery_events
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    trip_id is null
    or exists (
      select 1
      from public.trips t
      where t.id = discovery_events.trip_id
    )
  )
);
