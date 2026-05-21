-- Reference schema for the atlas project (public tables).
-- Source: Supabase information_schema export.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  airbnb_url text
);

create table public.location_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_name text not null,
  trip_date timestamptz,
  location uuid references public.locations (id),
  trip_code text not null unique
);

create table public.driving_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_id uuid not null references public.trips (id),
  name text
);

create table public.trip_participants (
  username text not null,
  trip_id uuid not null references public.trips (id),
  group_id uuid references public.driving_groups (id),
  group_order integer,
  location uuid references public.locations (id),
  is_driver boolean not null,
  password_hash text,
  is_admin boolean not null,
  seats integer
);
