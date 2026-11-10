-- Staged Web POS schema structural regression. Run after applying the
-- 20261110100000 migration to an isolated database, NOT production.
-- This test changes no records. It rejects accidental API exposure.
begin read only;
do $test$
declare
  table_name text;
  table_oid regclass;
  key_count integer;
begin
  foreach table_name in array array[
    'web_pos_sales',
    'web_pos_sale_lines',
    'web_pos_stock_reservations',
    'web_pos_reconciliation_outbox',
    'web_pos_payment_events'
  ] loop
    table_oid:=to_regclass('private.' || table_name);
    if table_oid is null then
      raise exception 'Missing staged web POS table: %',table_name;
    end if;
    if not exists (
      select 1 from pg_class c
      where c.oid=table_oid and c.relrowsecurity and c.relforcerowsecurity
    ) then
      raise exception 'Missing forced RLS: %',table_name;
    end if;
    if exists (
      select 1 from pg_policies p
      where p.schemaname='private' and p.tablename=table_name
    ) then
      raise exception 'Unexpected web POS table policy: %',table_name;
    end if;
    if has_table_privilege('anon',table_oid,'SELECT')
       or has_table_privilege('authenticated',table_oid,'SELECT')
       or has_table_privilege('anon',table_oid,'INSERT')
       or has_table_privilege('authenticated',table_oid,'INSERT')
       or has_table_privilege('anon',table_oid,'UPDATE')
       or has_table_privilege('authenticated',table_oid,'UPDATE')
       or has_table_privilege('anon',table_oid,'DELETE')
       or has_table_privilege('authenticated',table_oid,'DELETE') then
      raise exception 'Staged web POS table exposed to a client role: %',table_name;
    end if;
  end loop;
  if not exists (
    select 1 from pg_constraint
    where conrelid='private.web_pos_sales'::regclass
      and contype='u' and
      pg_get_constraintdef(oid) like '%business_id, idempotency_key%'
  ) then
    raise exception 'Missing per-business sale idempotency constraint';
  end if;
  select count(*) into key_count
    from pg_constraint c
    where c.contype='f' and c.conrelid in (
      'private.web_pos_sale_lines'::regclass,
      'private.web_pos_stock_reservations'::regclass
    ) and c.confrelid='public.desktop_products'::regclass;
  if key_count <> 2 then
    raise exception 'Expected business-scoped product foreign keys';
  end if;
  if to_regprocedure('private.web_pos_locked_sellable_milli(uuid,uuid)') is null then
    raise exception 'Missing locked sellable-stock function';
  end if;
  if has_function_privilege(
       'authenticated',
       'private.web_pos_locked_sellable_milli(uuid,uuid)',
       'EXECUTE'
     ) or has_function_privilege(
       'anon',
       'private.web_pos_locked_sellable_milli(uuid,uuid)',
       'EXECUTE'
     ) then
    raise exception 'Locked sellable-stock helper was exposed to clients';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('post_web_pos_sale','submit_web_pos_sale','commit_web_pos_sale')
  ) then
    raise exception 'Checkout must remain disabled pending posting qualification';
  end if;
end
$test$;
rollback;
