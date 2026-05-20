-- Add the missing RLS policies that admin actions need.
--
-- Why this is needed: previous migrations only granted SELECT/INSERT on most
-- tables (and UPDATE on trip_participants). Without these new policies,
-- features that DELETE or UPDATE silently return zero rows affected — no
-- error, no effect. That makes them very easy to mistake for working code.
--
-- TODO: when Supabase Auth + admin-aware policies land, replace `using (true)`
-- here with checks against the calling user's is_admin / membership on the
-- trip. Until then UI gating is our only line of defence.

-- trips: needed by the admin "update destination" feature so the destination
-- (and later other trip fields) can be changed.
drop policy if exists "trips_update_public" on public.trips;
create policy "trips_update_public"
  on public.trips for update
  to anon, authenticated
  using (true)
  with check (true);

-- trip_participants: needed by Peter's leave-trip endpoint and the admin
-- "remove a member" feature. Without this the DELETE call silently succeeds
-- but no row is removed.
drop policy if exists "trip_participants_delete_public" on public.trip_participants;
create policy "trip_participants_delete_public"
  on public.trip_participants for delete
  to anon, authenticated
  using (true);

-- driving_groups: needed by the admin "update destination" flow which resets
-- groups when the destination changes. UPDATE is included for when groups
-- are renamed or reassigned in the future.
drop policy if exists "driving_groups_update_public" on public.driving_groups;
create policy "driving_groups_update_public"
  on public.driving_groups for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "driving_groups_delete_public" on public.driving_groups;
create policy "driving_groups_delete_public"
  on public.driving_groups for delete
  to anon, authenticated
  using (true);
