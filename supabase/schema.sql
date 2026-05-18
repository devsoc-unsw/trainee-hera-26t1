-- Reference schema for the atlas project (public tables).
-- Source: Supabase information_schema export.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text,
  address text,
  latitude double precision,
  longitude double precision
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
  location uuid references public.locations (id),
  is_driver boolean not null,
  password_hash text,
  is_admin boolean not null,
  seats integer
);
