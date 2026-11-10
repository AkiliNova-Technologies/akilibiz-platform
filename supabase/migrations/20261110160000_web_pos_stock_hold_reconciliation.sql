-- Complete a web-originated sale only after its exact desktop sale
-- movements have been accepted in the hosted authoritative stock replay.
-- This RPC is scoped to a current owner and the original paired device.
-- It does not change desktop financial records or allow new sale posting.

create function public.reconcile_web_pos_stock_holds(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  target_event_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  actor uuid := (select auth.uid());
  ack private.web_pos_desktop_apply_receipts%rowtype;
  outbound private.web_pos_reconciliation_outbox%rowtype;
  hold_record record;
  accepted_movement_id bigint;
  matches bigint;
  remaining bigint;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Current business owner required' using errcode='42501';
  end if;
  if target_event_id is null or source_device_public_id is null
    or source_business_public_id is null or btrim(source_business_public_id)='' then
    raise exception 'Invalid reconciliation request' using errcode='22023';
  end if;
  if not exists (
    select 1 from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=source_business_public_id
      and d.device_public_id=source_device_public_id
      and d.paired_by=actor and d.revoked_at is null
  ) then
    raise exception 'Unrecognized or revoked desktop source' using errcode='42501';
  end if;
  -- Preserve lock ordering with hosted stock replay. A request must not race
  -- movement ingestion or hosted checkout for the same business/source.
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-web-pos:' || target_business_id::text,0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || target_business_id::text ||
    ':' || source_business_public_id,0
  ));

  select * into ack from private.web_pos_desktop_apply_receipts a
    where a.event_id=target_event_id and a.business_id=target_business_id
      and a.source_business_public_id=source_business_public_id
      and a.device_public_id=source_device_public_id;
  if not found then
    raise exception 'Committed desktop sale acknowledgement required'
      using errcode='23503';
  end if;
  select * into outbound from private.web_pos_reconciliation_outbox o
    where o.id=target_event_id and o.business_id=target_business_id
    for update;
  if not found or outbound.status not in ('desktop_applied','reconciled') then
    raise exception 'Sale has not been applied on the desktop'
      using errcode='23514';
  end if;
  if outbound.status='reconciled' then
    return true;
  end if;

  -- Refuse to release ANY hold until every sale line has exactly one
  -- source-linked, accepted stock_out movement with the expected product
  -- and exact negative quantity in the current checkpoint ledger.
  for hold_record in
    select h.product_id,h.quantity_milli,p.local_product_id
    from private.web_pos_stock_holds h
    join public.desktop_products p
      on p.business_id=h.business_id and p.id=h.product_id
    where h.business_id=target_business_id
      and h.sale_id=outbound.sale_id
      and h.state<>'released'
      and p.local_business_public_id=source_business_public_id
    order by p.local_product_id for update of h
  loop
    select min(r.source_movement_id),count(*)
      into accepted_movement_id,matches
    from private.desktop_inventory_movement_receipts r
    join private.desktop_inventory_checkpoints c
      on c.id=r.checkpoint_id
       and c.business_id=target_business_id
       and c.source_business_public_id=source_business_public_id
       and c.source_device_public_id=source_device_public_id
    join private.desktop_inventory_movement_cursors cursor
      on cursor.checkpoint_id=c.id
    where r.business_id=target_business_id
      and r.source_business_public_id=source_business_public_id
      and r.source_device_public_id=source_device_public_id
      and r.local_product_id=hold_record.local_product_id
      and r.source_movement_id>c.movement_watermark
      and r.source_movement_id<=cursor.latest_movement_id
      and r.delta_milli= -hold_record.quantity_milli
      and r.payload->>'reference_type'='sale'
      and r.payload->>'reference_id'=ack.local_sale_id::text
      and r.payload->>'movement_type'='stock_out'
      and r.payload->>'reason'='Sale completed';
    if matches<>1 or accepted_movement_id is null then
      return false;
    end if;
  end loop;

  select count(*) into remaining
  from private.web_pos_stock_holds h
  where h.business_id=target_business_id
    and h.sale_id=outbound.sale_id and h.state<>'released';
  if remaining=0 then
    -- A properly committed first reconciliation always has source stock
    -- holds. A completed retry was already handled by the status check above.
    -- Never declare success for missing/corrupt hold records.
    return false;
  end if;

  -- Do not tolerate unmapped / cross-source outstanding holds.
  if remaining <> (
    select count(*) from private.web_pos_stock_holds h
    join public.desktop_products p
      on p.business_id=h.business_id and p.id=h.product_id
    where h.business_id=target_business_id and h.sale_id=outbound.sale_id
      and h.state<>'released'
      and p.local_business_public_id=source_business_public_id
  ) then
    return false;
  end if;

  for hold_record in
    select h.product_id,h.quantity_milli,p.local_product_id
    from private.web_pos_stock_holds h
    join public.desktop_products p
      on p.business_id=h.business_id and p.id=h.product_id
    where h.business_id=target_business_id
      and h.sale_id=outbound.sale_id and h.state<>'released'
      and p.local_business_public_id=source_business_public_id
    order by p.local_product_id for update of h
  loop
    select r.source_movement_id into accepted_movement_id
    from private.desktop_inventory_movement_receipts r
    join private.desktop_inventory_checkpoints c on c.id=r.checkpoint_id
    where r.business_id=target_business_id
      and r.source_business_public_id=source_business_public_id
      and r.source_device_public_id=source_device_public_id
      and c.business_id=target_business_id
      and c.source_business_public_id=source_business_public_id
      and c.source_device_public_id=source_device_public_id
      and r.local_product_id=hold_record.local_product_id
      and r.delta_milli= -hold_record.quantity_milli
      and r.payload->>'reference_type'='sale'
      and r.payload->>'reference_id'=ack.local_sale_id::text
      and r.payload->>'movement_type'='stock_out'
      and r.payload->>'reason'='Sale completed';
    update private.web_pos_stock_holds h
       set state='released',reflected_movement_id=accepted_movement_id,
           reflected_at=now()
    where h.business_id=target_business_id
      and h.sale_id=outbound.sale_id and h.product_id=hold_record.product_id
      and h.state<>'released';
  end loop;
  update private.web_pos_reconciliation_outbox
     set status='reconciled'
     where id=target_event_id and business_id=target_business_id;
  update private.web_pos_sales
     set status='reconciled'
     where business_id=target_business_id and id=outbound.sale_id
       and status='desktop_applied';
  return true;
end;
$$;

revoke all on function public.reconcile_web_pos_stock_holds(uuid,text,uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.reconcile_web_pos_stock_holds(uuid,text,uuid,uuid)
 to authenticated;
