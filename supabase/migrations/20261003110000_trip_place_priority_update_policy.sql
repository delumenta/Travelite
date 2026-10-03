-- Let trip editors persist per-trip Must-go / Optional choices on existing catalogue pins.
drop policy if exists "Editors update trip places" on public.trip_places;
create policy "Editors update trip places" on public.trip_places
  for update to authenticated
  using (public.is_trip_owner(trip_id) or public.is_trip_editor(trip_id))
  with check (public.is_trip_owner(trip_id) or public.is_trip_editor(trip_id));
grant update on public.trip_places to authenticated;
