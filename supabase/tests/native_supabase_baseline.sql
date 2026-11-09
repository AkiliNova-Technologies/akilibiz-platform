\set ON_ERROR_STOP on

-- Minimal native-PostgreSQL compatibility layer for repository migrations.
-- It intentionally models only objects referenced by this project; GoTrue,
-- PostgREST, Realtime and other Supabase services are outside this test layer.
create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema auth;
revoke all on schema auth from public;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text unique,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function auth.uid()
returns uuid language sql stable set search_path = ''
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
revoke all on function auth.uid() from public;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase installs this event-trigger function in its managed baseline. The
-- application migrations only revoke direct execution; they do not call it.
create function public.rls_auto_enable()
returns event_trigger language plpgsql as $$ begin end $$;
revoke all on function public.rls_auto_enable() from public;
