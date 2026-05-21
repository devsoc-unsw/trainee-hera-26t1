-- Destination accommodation: optional Airbnb URL + uploaded images (Supabase Storage).

-- 1. Optional Airbnb link on the destination location row
alter table public.locations
  add column if not exists airbnb_url text;

-- 2. Image metadata (files live in Storage bucket trip-destination-images)
create table if not exists public.location_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists location_images_location_id_idx
  on public.location_images (location_id);

-- 3. RLS for location_images (same open pattern as other tables)
alter table public.location_images enable row level security;

drop policy if exists "location_images_select_public" on public.location_images;
create policy "location_images_select_public"
  on public.location_images for select
  to anon, authenticated
  using (true);

drop policy if exists "location_images_insert_public" on public.location_images;
create policy "location_images_insert_public"
  on public.location_images for insert
  to anon, authenticated
  with check (true);

drop policy if exists "location_images_delete_public" on public.location_images;
create policy "location_images_delete_public"
  on public.location_images for delete
  to anon, authenticated
  using (true);

-- Allow updating airbnb_url on an existing destination without re-inserting a location row
drop policy if exists "locations_update_public" on public.locations;
create policy "locations_update_public"
  on public.locations for update
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Storage bucket (public read for next/image and gallery)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-destination-images',
  'trip-destination-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5. Storage object policies (path: trips/{trip_id}/locations/{location_id}/{filename})
drop policy if exists "trip_destination_images_select" on storage.objects;
create policy "trip_destination_images_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'trip-destination-images');

drop policy if exists "trip_destination_images_insert" on storage.objects;
create policy "trip_destination_images_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'trip-destination-images'
    and (storage.foldername(name))[1] = 'trips'
    and (storage.foldername(name))[3] = 'locations'
  );

drop policy if exists "trip_destination_images_delete" on storage.objects;
create policy "trip_destination_images_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'trip-destination-images');
