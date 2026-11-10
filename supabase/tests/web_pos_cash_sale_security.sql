-- Run against an ISOLATED database after applying the staged web POS migration.
-- Read-only assertions; no test businesses or users created. A complete
-- transaction/concurrency fixture is still required before activation.
begin read only;

do $$
declare
  object_name text;
  tables_checked integer := 0;
begin
  foreach object_name in array array[
    'web_pos_posting_controls','web_pos_tax_settings',
    'web_pos_product_tax_rules','web_pos_sales','web_pos_sale_lines',
    'web_pos_payments','web_pos_stock_holds','web_pos_reconciliation_outbox',
    'web_pos_desktop_apply_receipts'
  ] loop
    if not exists (
      select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='private' and c.relname=object_name
        and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity
    ) then
      raise exception 'Private POS table missing forced RLS: %',object_name;
    end if;
    if exists (
      select 1 from pg_catalog.pg_policies p
      where p.schemaname='private' and p.tablename=object_name
    ) then
      raise exception 'Private POS table unexpectedly exposes an RLS policy: %',object_name;
    end if;
    if has_table_privilege('anon','private.'||object_name,'SELECT')
      or has_table_privilege('authenticated','private.'||object_name,'SELECT')
      or has_table_privilege('authenticated','private.'||object_name,'INSERT')
      or has_table_privilege('authenticated','private.'||object_name,'UPDATE')
      or has_table_privilege('authenticated','private.'||object_name,'DELETE')
      or has_table_privilege('service_role','private.'||object_name,'SELECT') then
      raise exception 'Unexpected direct client privilege: %',object_name;
    end if;
    tables_checked := tables_checked+1;
  end loop;
  if tables_checked <> 9 then raise exception 'Unexpected POS table count'; end if;

  if exists (select 1 from private.web_pos_posting_controls
      where cash_posting_enabled) then
    raise exception 'Posting gate enabled: migration must default to off';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)','EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)','EXECUTE'
  ) then
    raise exception 'Unexpected web POS posting RPC grants';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.list_web_pos_sellable_inventory(uuid)','EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.list_web_pos_sellable_inventory(uuid)','EXECUTE'
  ) then
    raise exception 'Unexpected hold-aware inventory RPC grants';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='list_web_pos_sellable_inventory'
      and p.prosecdef
      and p.proconfig @> array['search_path=']::text[]
  ) then
    raise exception 'Missing fixed search path on hold-aware inventory RPC';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.reconcile_web_pos_stock_holds(uuid,text,uuid,uuid)','EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.reconcile_web_pos_stock_holds(uuid,text,uuid,uuid)','EXECUTE'
  ) then
    raise exception 'Unexpected web POS stock reconciliation RPC grants';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='reconcile_web_pos_stock_holds'
      and p.prosecdef
      and p.proconfig @> array['search_path=']::text[]
  ) then
    raise exception 'Missing fixed search path on stock reconciliation RPC';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.ack_applied_web_pos_sale(uuid,text,uuid,uuid,bigint,uuid)','EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.ack_applied_web_pos_sale(uuid,text,uuid,uuid,bigint,uuid)','EXECUTE'
  ) then
    raise exception 'Unexpected web POS application ACK RPC grants';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='ack_applied_web_pos_sale'
      and p.prosecdef
      and p.proconfig @> array['search_path=']::text[]
  ) then
    raise exception 'Missing fixed search path on web POS ACK RPC';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.list_pending_web_pos_sales(uuid,text,uuid,integer)','EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.list_pending_web_pos_sales(uuid,text,uuid,integer)','EXECUTE'
  ) then
    raise exception 'Unexpected web POS delivery inbox RPC grants';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='list_pending_web_pos_sales'
      and p.prosecdef
      and p.proconfig @> array['search_path=']::text[]
  ) then
    raise exception 'Missing fixed search path on web POS inbox RPC';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='post_web_pos_cash_sale'
      and p.prosecdef
      and p.proconfig @> array['search_path=']::text[]
  ) then
    raise exception 'Missing fixed search path on POS posting RPC';
  end if;
end
$$;

rollback;
