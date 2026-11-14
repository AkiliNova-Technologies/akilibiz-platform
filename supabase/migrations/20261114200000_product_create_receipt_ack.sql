-- Phase 2C3: acknowledge only a durable, explicitly staff-approved desktop
-- product receipt. No server-side product insert or direct catalogue mutation.
alter table private.desktop_product_create_commands
  add column local_receipt_id uuid,
  add column local_product_id bigint check(local_product_id is null or local_product_id>0),
  add column applied_at timestamptz;
alter table private.desktop_product_create_commands
  add constraint desktop_product_create_receipt_consistency
  check ((state='applied') = (local_receipt_id is not null
    and local_product_id is not null and applied_at is not null));

-- One desktop receipt and local product can never confirm two distinct
-- web commands, even under replay or competing paired-device requests.
create unique index desktop_product_create_unique_receipt
  on private.desktop_product_create_commands(business_id,local_receipt_id)
  where local_receipt_id is not null;
create unique index desktop_product_create_unique_local_product
  on private.desktop_product_create_commands(
    business_id,source_business_public_id,local_product_id)
  where local_product_id is not null;

create function public.ack_desktop_product_create(
 target_business_id uuid,
 source_business_public_id text,
 source_device_public_id uuid,
 target_command_id uuid,
 receipt_id uuid,
 local_product_id bigint
) returns text language plpgsql security definer set search_path='' as $$
declare cmd private.desktop_product_create_commands%rowtype;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if target_command_id is null or receipt_id is null or
     local_product_id is null or local_product_id<=0 then
    raise exception 'Invalid product receipt' using errcode='22023';
  end if;
  select * into cmd from private.desktop_product_create_commands c
    where c.id=target_command_id and c.business_id=target_business_id
      and c.source_business_public_id=ack_desktop_product_create.source_business_public_id
      and c.source_device_public_id=ack_desktop_product_create.source_device_public_id
    for update;
  if not found then
    raise exception 'Product command does not belong to this desktop'
      using errcode='42501';
  end if;
  if cmd.state='applied' then
    if cmd.local_receipt_id=receipt_id and cmd.local_product_id=local_product_id then
      return 'applied';
    end if;
    raise exception 'Conflicting product receipt' using errcode='23505';
  end if;
  if cmd.state<>'pending' then
    raise exception 'Command cannot be acknowledged in this state' using errcode='55000';
  end if;
  update private.desktop_product_create_commands c set
    state='applied',local_receipt_id=receipt_id,
    local_product_id=ack_desktop_product_create.local_product_id,
    applied_at=now()
    where c.id=target_command_id and c.state='pending';
  return 'applied';
end $$;
revoke all on function public.ack_desktop_product_create(uuid,text,uuid,uuid,uuid,bigint)
  from public,anon,authenticated,service_role;
grant execute on function public.ack_desktop_product_create(uuid,text,uuid,uuid,uuid,bigint)
  to authenticated;

-- 'published' is a derived status only after the desktop-authored product
-- projection matches the original source, category and SKU.
create or replace function public.desktop_product_create_status(
  target_business_id uuid,target_command_id uuid
) returns table(command_id uuid,draft_id uuid,state text,requested_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Owner access required' using errcode='42501';
  end if;
  return query
    select c.id,c.draft_id,
      case when c.state='applied' and exists(
        select 1 from public.desktop_products p
        where p.business_id=c.business_id
          and p.local_business_public_id=c.source_business_public_id
          and p.local_product_id=c.local_product_id
          and p.category_id=c.category_id
          and p.sku=(c.payload->>'sku')
      ) then 'published' else c.state end,
      c.created_at
    from private.desktop_product_create_commands c
    where c.business_id=target_business_id and c.id=target_command_id
      and c.requested_by=(select auth.uid());
end $$;

-- Fresh authorization before LOCAL approval: a command staged yesterday is
-- not authority to apply after its pairing, owner or pilot control is revoked.
create function public.verify_desktop_product_create_pending(
 target_business_id uuid,
 source_business_public_id text,
 source_device_public_id uuid,
 target_command_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  return exists (
    select 1 from private.desktop_product_create_commands c
    join private.desktop_product_create_controls ctl on ctl.business_id=c.business_id
    where c.id=target_command_id and c.business_id=target_business_id
      and c.source_business_public_id=verify_desktop_product_create_pending.source_business_public_id
      and c.source_device_public_id=verify_desktop_product_create_pending.source_device_public_id
      and c.requested_by=(select auth.uid())
      and ctl.requests_enabled=true
      and c.state='pending'
  );
end $$;
revoke all on function public.verify_desktop_product_create_pending(uuid,text,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.verify_desktop_product_create_pending(uuid,text,uuid,uuid)
  to authenticated;
