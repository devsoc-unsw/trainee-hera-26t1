-- Allow participants to update their role (e.g. driver / passenger toggle)

drop policy if exists "trip_participants_update_public" on public.trip_participants;
create policy "trip_participants_update_public"
  on public.trip_participants for update
  to anon, authenticated
  using (true)
  with check (true);
