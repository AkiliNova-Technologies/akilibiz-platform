-- Approved purchase order receipts only. Never create goods receipts, stock,
-- supplier payables, tax events or journal lines on the hosted service.
alter table private.desktop_purchase_order_requests
 add column local_receipt_id uuid,
 add column local_purchase_order_id bigint check(local_purchase_order_id is null or local_purchase_order_id>0),
 add column local_purchase_order_public_id uuid,
 add column applied_at timestamptz;
alter table private.desktop_purchase_order_requests
 add constraint desktop_purchase_receipt_consistency check (
  (state='applied') = (
   local_receipt_id is not null and local_purchase_order_id is not null and
   local_purchase_order_public_id is not null and applied_at is not null)
 );
create unique index desktop_purchase_unique_receipt on
 private.desktop_purchase_order_requests(business_id,local_receipt_id)
 where local_receipt_id is not null;
create unique index desktop_purchase_unique_local_order on
 private.desktop_purchase_order_requests(
 business_id,source_business_public_id,local_purchase_order_id)
 where local_purchase_order_id is not null;
create unique index desktop_purchase_unique_order_public on
 private.desktop_purchase_order_requests(business_id,local_purchase_order_public_id)
 where local_purchase_order_public_id is not null;

-- Fresh, paired owner/device authorization at the instant of local approval.
create function public.verify_desktop_purchase_order_pending(
 target_business_id uuid, source_business_public_id text,
 source_device_public_id uuid,target_command_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_desktop_inventory_source(
  target_business_id,source_business_public_id,source_device_public_id);
 return exists(
  select 1 from private.desktop_purchase_order_requests c
  join private.desktop_purchase_order_request_controls ctl
    on ctl.business_id=c.business_id
  where c.id=target_command_id and c.business_id=target_business_id
    and c.source_business_public_id=verify_desktop_purchase_order_pending.source_business_public_id
    and c.source_device_public_id=verify_desktop_purchase_order_pending.source_device_public_id
    and c.requested_by=(select auth.uid()) and c.state='pending'
    and ctl.requests_enabled
 );
end $$;

create function public.ack_desktop_purchase_order(
 target_business_id uuid, source_business_public_id text,
 source_device_public_id uuid,target_command_id uuid,
 receipt_id uuid,local_purchase_order_id bigint,
 local_purchase_order_public_id uuid
) returns text language plpgsql security definer set search_path='' as $$
declare command private.desktop_purchase_order_requests%rowtype;
begin
 perform private.require_desktop_inventory_source(
  target_business_id,source_business_public_id,source_device_public_id);
 if target_command_id is null or receipt_id is null or
  local_purchase_order_id is null or local_purchase_order_id<=0 or
  local_purchase_order_public_id is null then
  raise exception 'Invalid purchase order approval receipt' using errcode='22023';
 end if;
 select * into command from private.desktop_purchase_order_requests c
 where c.id=target_command_id and c.business_id=target_business_id
  and c.source_business_public_id=ack_desktop_purchase_order.source_business_public_id
  and c.source_device_public_id=ack_desktop_purchase_order.source_device_public_id
 for update;
 if not found then
  raise exception 'Purchase order command does not belong to this desktop'
   using errcode='42501';
 end if;
 if command.state='applied' then
  if command.local_receipt_id=receipt_id and
   command.local_purchase_order_id=ack_desktop_purchase_order.local_purchase_order_id and
   command.local_purchase_order_public_id=ack_desktop_purchase_order.local_purchase_order_public_id
  then return 'applied'; end if;
  raise exception 'Conflicting purchase order receipt' using errcode='23505';
 end if;
 if command.state<>'pending' then
  raise exception 'Purchase order request cannot be acknowledged' using errcode='55000';
 end if;
 update private.desktop_purchase_order_requests c set
  state='applied',local_receipt_id=receipt_id,
  local_purchase_order_id=ack_desktop_purchase_order.local_purchase_order_id,
  local_purchase_order_public_id=ack_desktop_purchase_order.local_purchase_order_public_id,
  applied_at=now()
 where c.id=target_command_id and c.state='pending';
 return 'applied';
end $$;

revoke all on function public.verify_desktop_purchase_order_pending(uuid,text,uuid,uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.ack_desktop_purchase_order(uuid,text,uuid,uuid,uuid,bigint,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.verify_desktop_purchase_order_pending(uuid,text,uuid,uuid)
 to authenticated;
grant execute on function public.ack_desktop_purchase_order(uuid,text,uuid,uuid,uuid,bigint,uuid)
 to authenticated;

-- A request can be displayed as synchronized only when the authoritative
-- desktop purchasing mirror actually contains the matching source/local order.
-- The original request remains immutable and independently auditable.
