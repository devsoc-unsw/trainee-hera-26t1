-- Allow trip edits for the anon key (temporary / dev-friendly).
-- Tighten this once you have proper trip-scoped auth (e.g. only admins can edit).

alter table public.trips enable row level security;

drop policy if exists "trips_update_public" on public.trips;
create policy "trips_update_public"
  on public.trips for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "trips_delete_public" on public.trips;
create policy "trips_delete_public"
  on public.trips for delete
  to anon, authenticated
  using (true);

