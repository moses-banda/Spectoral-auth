-- ═══════════════════════════════════════════════════════════════════
-- SpecAuth Supabase Schema
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- after creating a new project.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Enable the pgvector extension ──────────────────────────────
create extension if not exists vector;


-- ── 2. Profiles table ─────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  brand           text,
  color_code      text,
  category        text not null default 'other',
  spectrum        vector(10) not null,
  description     text,
  notes           text,
  photo_url       text,
  created_at      timestamptz default now()
);

-- Fast cosine-similarity search index
create index if not exists profiles_spectrum_idx
  on profiles using ivfflat (spectrum vector_cosine_ops)
  with (lists = 100);

-- Category filter helper
create index if not exists profiles_category_idx
  on profiles (category);


-- ── 3. Scans table (history) ──────────────────────────────────────
create table if not exists scans (
  id           uuid primary key default gen_random_uuid(),
  timestamp    timestamptz default now(),
  spectrum     vector(10) not null,
  top_matches  jsonb,
  notes        text
);

create index if not exists scans_timestamp_idx
  on scans (timestamp desc);


-- ── 4. Match query RPC ────────────────────────────────────────────
-- Returns top-K closest profiles by cosine similarity.
-- Similarity = 1 - cosine_distance, so higher is better.
create or replace function match_profiles(
  query_spectrum vector(10),
  match_limit    int default 5
)
returns table (
  id           uuid,
  name         text,
  brand        text,
  color_code   text,
  category     text,
  description  text,
  spectrum     vector(10),
  similarity   float
)
language sql stable
as $$
  select
    p.id,
    p.name,
    p.brand,
    p.color_code,
    p.category,
    p.description,
    p.spectrum,
    1 - (p.spectrum <=> query_spectrum) as similarity
  from profiles p
  order by p.spectrum <=> query_spectrum
  limit match_limit;
$$;


-- ── 5. Dataset scans (labeled spectra for CNN training) ────────────
create table if not exists dataset_scans (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  spectrum    vector(10) not null,
  session_id  uuid,
  sample_id   text,             -- e.g. "leaf_plant_1" — prevents class leakage
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists dataset_scans_label_idx   on dataset_scans (label);
create index if not exists dataset_scans_session_idx on dataset_scans (session_id);
create index if not exists dataset_scans_sample_idx  on dataset_scans (sample_id);

-- Helper: counts per class
create or replace function dataset_class_counts()
returns table (label text, count bigint)
language sql stable
as $$
  select label, count(*)::bigint
  from dataset_scans
  group by label
  order by label;
$$;

-- Helper: full dataset export for training
create or replace function dataset_export()
returns table (
  id uuid, label text, spectrum vector(10),
  session_id uuid, sample_id text, created_at timestamptz
)
language sql stable
as $$
  select id, label, spectrum, session_id, sample_id, created_at
  from dataset_scans
  order by created_at;
$$;


-- ── 6. Row-level security (single-user setup) ─────────────────────
-- For a single-user personal DB, RLS is optional. If you ever add
-- multi-user support, enable RLS and add policies here.
-- Leaving disabled for now since this is a personal database.
