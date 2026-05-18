-- Allow create-trip / join-trip / add-address APIs to work with the anon key.
-- Tighten these policies when you add Supabase Auth or trip-scoped access.

alter table public.trips enable row level security;
alter table public.trip_participants enable row level security;
alter table public.locations enable row level security;
alter table public.driving_groups enable row level security;

-- trips
drop policy if exists "trips_select_public" on public.trips;
create policy "trips_select_public"
  on public.trips for select
  to anon, authenticated
  using (true);

drop policy if exists "trips_insert_public" on public.trips;
create policy "trips_insert_public"
  on public.trips for insert
  to anon, authenticated
  with check (true);

-- trip_participants
drop policy if exists "trip_participants_select_public" on public.trip_participants;
create policy "trip_participants_select_public"
  on public.trip_participants for select
  to anon, authenticated
  using (true);

drop policy if exists "trip_participants_insert_public" on public.trip_participants;
create policy "trip_participants_insert_public"
  on public.trip_participants for insert
  to anon, authenticated
  with check (true);

-- locations
drop policy if exists "locations_select_public" on public.locations;
create policy "locations_select_public"
  on public.locations for select
  to anon, authenticated
  using (true);

drop policy if exists "locations_insert_public" on public.locations;
create policy "locations_insert_public"
  on public.locations for insert
  to anon, authenticated
  with check (true);

-- driving_groups (for future features)
drop policy if exists "driving_groups_select_public" on public.driving_groups;
create policy "driving_groups_select_public"
  on public.driving_groups for select
  to anon, authenticated
  using (true);

drop policy if exists "driving_groups_insert_public" on public.driving_groups;
create policy "driving_groups_insert_public"
  on public.driving_groups for insert
  to anon, authenticated
  with check (true);
