-- Receipts on AkiliBiz Web.
--
-- 1. Desktops publish one canonical receipt per sale (desktop migration 0128,
--    entity "receipt_snapshots") through the business mirror, so the web shows
--    and prints exactly the receipt the desktop produces. Allow that entity in
--    the mirror's staging and finalization allowlists.
-- 2. The desktop records each receipt print locally. A print from the web is
--    recorded here instead (the web cannot write the desktop audit log).

do $migration$
declare
  definition text;
  fn text;
  marker text := '''customer_credit_events'')';
begin
  foreach fn in array array[
    'public.stage_desktop_business_snapshot_chunk',
    'public.finalize_desktop_business_snapshot'
  ] loop
    select pg_get_functiondef(p.oid) into definition
      from pg_proc p
     where p.oid = (select min(x.oid) from pg_proc x join pg_namespace n on n.oid=x.pronamespace
                     where n.nspname='public' and x.proname=split_part(fn,'.',2));
    if definition is null or position(marker in definition) = 0 then
      raise exception 'Reviewed % allowlist was not found', fn;
    end if;
    execute replace(definition, marker, '''customer_credit_events'',''receipt_snapshots'')');
  end loop;
end
$migration$;

create table private.web_receipt_prints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  local_business_public_id text not null,
  local_sale_id bigint not null check (local_sale_id > 0),
  printed_by uuid not null references auth.users(id) on delete restrict,
  printed_at timestamptz not null default now()
);
create index web_receipt_prints_by_sale on private.web_receipt_prints(business_id, local_sale_id);
alter table private.web_receipt_prints enable row level security;
alter table private.web_receipt_prints force row level security;
revoke all on private.web_receipt_prints from public,anon,authenticated,service_role;

-- Record that a staff member printed a mirrored desktop receipt on the web.
create function public.record_web_receipt_print(
  target_business_id uuid, source_business_public_id text, target_sale_id bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); permission public.business_role; result uuid;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select m.role into permission from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active;
  if permission is null or permission not in ('owner','manager','cashier') then
    raise exception 'Business sales permission required' using errcode='42501';
  end if;
  if not exists (select 1 from public.desktop_business_records r
     where r.business_id=target_business_id
       and r.local_business_public_id=record_web_receipt_print.source_business_public_id
       and r.entity_type='receipt_snapshots' and r.local_record_id=target_sale_id) then
    raise exception 'Receipt not found' using errcode='23503';
  end if;
  insert into private.web_receipt_prints(business_id,local_business_public_id,local_sale_id,printed_by)
  values (target_business_id,source_business_public_id,target_sale_id,actor)
  returning id into result;
  return result;
end $$;
revoke all on function public.record_web_receipt_print(uuid,text,bigint)
  from public,anon,authenticated,service_role;
grant execute on function public.record_web_receipt_print(uuid,text,bigint) to authenticated;
