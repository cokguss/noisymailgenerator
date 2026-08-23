-- ============================================================
-- Noisy Mail Generator - visitor stats schema (Supabase)
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.stats_counters (
  key   text primary key,
  value bigint not null default 0
);

create table if not exists public.stats_sets (
  key    text not null,
  member text not null,
  primary key (key, member)
);

create table if not exists public.stats_hashes (
  key   text not null,
  field text not null,
  value bigint not null default 0,
  primary key (key, field)
);

-- counter: incr & get
create or replace function stats_incr(p_key text, p_by bigint default 1)
returns bigint language sql as $$
  insert into stats_counters (key, value) values (p_key, p_by)
  on conflict (key) do update set value = stats_counters.value + excluded.value
  returning value;
$$;

create or replace function stats_get(p_key text)
returns bigint language sql stable as $$
  select value from stats_counters where key = p_key;
$$;

-- set: sadd & scard (unique visitors per hari)
create or replace function stats_sadd(p_key text, p_member text)
returns void language sql as $$
  insert into stats_sets (key, member) values (p_key, p_member)
  on conflict do nothing;
$$;

create or replace function stats_scard(p_key text)
returns bigint language sql stable as $$
  select count(*)::bigint from stats_sets where key = p_key;
$$;

-- hash: hincr & hgetall (per halaman / referrer / device)
create or replace function stats_hincr(p_key text, p_field text, p_by bigint default 1)
returns void language sql as $$
  insert into stats_hashes (key, field, value) values (p_key, p_by)
  on conflict (key, field) do update set value = stats_hashes.value + excluded.value;
$$;

create or replace function stats_hgetall(p_key text)
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(field, value), '{}'::jsonb)
  from stats_hashes where key = p_key;
$$;
