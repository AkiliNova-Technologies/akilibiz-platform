-- Isolated PostgreSQL fixture and VAT evidence RPC acceptance.
-- Run only in a disposable CI database after web_pos_isolated_bootstrap.sql.
\set ON_ERROR_STOP on
create or replace function private.require_desktop_inventory_source(
  target_business_id uuid,source_business_public_id text,source_device_public_id uuid
) returns void language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=(select auth.uid())
      and m.active and m.role='owner'
  ) or not exists (
    select 1 from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=source_business_public_id
      and d.device_public_id=source_device_public_id
      and d.paired_by=(select auth.uid()) and d.revoked_at is null
  ) then
    raise exception 'Unrecognized or revoked desktop source' using errcode='42501';
  end if;
end $$;
-- Migrations 20261108195000 and 20261111112000 must be installed
-- AFTER this function exists and BEFORE the test below.
