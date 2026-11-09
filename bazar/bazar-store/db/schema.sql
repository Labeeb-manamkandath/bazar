-- Bazar database. Paste this whole file into Supabase > SQL Editor > Run.
create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default '',
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references categories(id) on delete restrict,
  price numeric(12,2) not null check (price >= 0),
  price_unit text not null default '',
  quantity_value text not null default '',
  quantity_unit text not null default '',
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  wa_link text not null default '',
  status text not null default 'active' check (status in ('active','inactive')),
  in_stock boolean not null default true,
  featured boolean not null default false,
  popular boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Lock the tables: only the server (service role key) can read or write them.
alter table categories enable row level security;
alter table products enable row level security;
alter table settings enable row level security;

-- Public bucket for product photos.
insert into storage.buckets (id, name, public)
values ('bazar', 'bazar', true)
on conflict (id) do nothing;
