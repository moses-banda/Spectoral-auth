-- ═══════════════════════════════════════════════════════════════════
-- Lumen Schema — Spectral Memory Aid
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- This is idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Extensions ─────────────────────────────────────────────────
create extension if not exists vector;


-- ── 1. Migrate profiles → objects (if profiles exists) ────────────
do $$
begin
  -- Rename existing profiles table if it exists and objects doesn't
  if exists (select 1 from information_schema.tables where table_name = 'profiles')
     and not exists (select 1 from information_schema.tables where table_name = 'objects')
  then
    alter table profiles rename to objects;
    raise notice 'Renamed profiles → objects';
  end if;
end $$;


-- ── 2. Create objects table (fresh if no migration) ───────────────
create table if not exists objects (
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


-- ── 3. Add new columns for Lumen ──────────────────────────────────
-- Using ALTER TABLE ... ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+)
alter table objects add column if not exists owner              text;
alter table objects add column if not exists location           text;
alter table objects add column if not exists spectrum_a         vector(10);
alter table objects add column if not exists spectrum_b         vector(10);
alter table objects add column if not exists spectrum_c         vector(10);
alter table objects add column if not exists voice_transcript   text;
alter table objects add column if not exists created_by         text;
alter table objects add column if not exists identify_count     int default 0;
alter table objects add column if not exists last_identified_at timestamptz;


-- ── 4. Indexes ────────────────────────────────────────────────────
-- Drop old profile-era indexes if they exist
drop index if exists profiles_spectrum_idx;
drop index if exists profiles_category_idx;

-- Spectrum kNN search (ivfflat needs rows; skip if table is empty)
do $$
begin
  if (select count(*) from objects) > 0 then
    create index if not exists objects_spectrum_idx
      on objects using ivfflat (spectrum vector_cosine_ops)
      with (lists = 100);
  else
    raise notice 'Skipping ivfflat index — table is empty. Will be created on first insert.';
  end if;
exception when others then
  raise notice 'ivfflat index skipped: %', SQLERRM;
end $$;

-- Lookup indexes
create index if not exists objects_category_idx on objects (category);
create index if not exists objects_owner_idx    on objects (owner);


-- ── 5. Identification log ─────────────────────────────────────────
create table if not exists identification_log (
  id              uuid primary key default gen_random_uuid(),
  object_id       uuid references objects(id) on delete set null,
  object_name     text,
  similarity      float not null,
  confidence_tier text not null default 'unsure',   -- sure / likely / unsure / unknown
  spectrum        vector(10) not null,
  created_at      timestamptz default now()
);

create index if not exists idlog_created_idx
  on identification_log (created_at desc);
create index if not exists idlog_object_idx
  on identification_log (object_id);


-- ── 6. RPC: identify_object ───────────────────────────────────────
-- kNN search across all enrolled objects. Returns top-K matches.
create or replace function identify_object(
  query_spectrum vector(10),
  match_limit    int default 5
)
returns table (
  id              uuid,
  name            text,
  owner           text,
  category        text,
  description     text,
  location        text,
  spectrum        vector(10),
  similarity      float
)
language sql stable
as $$
  select
    o.id,
    o.name,
    o.owner,
    o.category,
    o.description,
    o.location,
    o.spectrum,
    1 - (o.spectrum <=> query_spectrum) as similarity
  from objects o
  order by o.spectrum <=> query_spectrum
  limit match_limit;
$$;


-- ── 7. RPC: log_identification ────────────────────────────────────
-- Atomically logs an identification event and bumps the object's counters.
create or replace function log_identification(
  p_object_id   uuid,
  p_object_name text,
  p_similarity  float,
  p_tier        text,
  p_spectrum    vector(10)
)
returns void
language plpgsql
as $$
begin
  -- Insert log row
  insert into identification_log (object_id, object_name, similarity, confidence_tier, spectrum)
  values (p_object_id, p_object_name, p_similarity, p_tier, p_spectrum);

  -- Bump counters on the object (if it exists)
  if p_object_id is not null then
    update objects
    set identify_count     = identify_count + 1,
        last_identified_at = now()
    where id = p_object_id;
  end if;
end;
$$;


-- ── 8. Keep legacy match_profiles for backwards compat ────────────
-- (CapturePage and old code may still reference it)
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
  from objects p
  order by p.spectrum <=> query_spectrum
  limit match_limit;
$$;


-- ── 9. Keep dataset tables (CNN training — unchanged) ─────────────
create table if not exists dataset_scans (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  spectrum    vector(10) not null,
  session_id  uuid,
  sample_id   text,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists dataset_scans_label_idx   on dataset_scans (label);
create index if not exists dataset_scans_session_idx on dataset_scans (session_id);
create index if not exists dataset_scans_sample_idx  on dataset_scans (sample_id);

create or replace function dataset_class_counts()
returns table (label text, count bigint)
language sql stable
as $$
  select label, count(*)::bigint
  from dataset_scans
  group by label
  order by label;
$$;

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


-- ── 10. Scans table (legacy history — keep for compat) ────────────
create table if not exists scans (
  id           uuid primary key default gen_random_uuid(),
  timestamp    timestamptz default now(),
  spectrum     vector(10) not null,
  top_matches  jsonb,
  notes        text
);

create index if not exists scans_timestamp_idx
  on scans (timestamp desc);


-- ═══════════════════════════════════════════════════════════════════
-- Done. Check notices above for migration actions taken.
-- ═══════════════════════════════════════════════════════════════════
