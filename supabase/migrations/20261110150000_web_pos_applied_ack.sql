-- Explicit desktop-application acknowledgements. Additive, read-only
-- relative to inventory: the stock holds remain pending until hosted inventory
-- movement receipts prove the corresponding source adjustments are reflected.
-- This does NOT enable hosted cash-sale posting.

create table private.web_pos_desktop_apply_receipts (
  event_id uuid primary key references private.web_pos_reconciliation_outbox(id)
    on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  source_business_public_id text not null,
  device_public_id uuid not null,
  local_sale_id bigint not null check (local_sale_id > 0),
  ack_request_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  unique (business_id,source_business_public_id,local_sale_id),
  unique (business_id,device_public_id,ack_request_id)
);
alter table private.web_pos_desktop_apply_receipts enable row level security;
alter table private.web_pos_desktop_apply_receipts force row level security;
revoke all on private.web_pos_desktop_apply_receipts from public,anon,authenticated,service_role;

create function public.ack_applied_web_pos_sale(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  target_event_id uuid,
  local_sale_id bigint,
  ack_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor uuid := (select auth.uid());
  receipt private.web_pos_desktop_apply_receipts%rowtype;
  outbox_record private.web_pos_reconciliation_outbox%rowtype;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Current cloud business owner required' using errcode='42501';
  end if;
  if source_business_public_id is null or btrim(source_business_public_id)=''
    or source_device_public_id is null or target_event_id is null
    or local_sale_id is null or local_sale_id < 1 or ack_request_id is null then
    raise exception 'Invalid desktop application receipt' using errcode='22023';
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
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-web-pos:' || target_business_id::text,0
  ));
  select * into outbox_record from private.web_pos_reconciliation_outbox o
    where o.id=target_event_id and o.business_id=target_business_id
    for update;
  if not found or outbox_record.status not in
    ('pending','delivering','desktop_applied','reconciled') then
    raise exception 'No matching web sale outbox event' using errcode='23503';
  end if;
  if not exists (
    select 1 from private.web_pos_sale_lines l
    join public.desktop_products p
      on p.business_id=l.business_id and p.id=l.product_id
    where l.business_id=target_business_id
      and l.sale_id=outbox_record.sale_id
      and p.local_business_public_id=source_business_public_id
  ) or exists (
    select 1 from private.web_pos_sale_lines l
    left join public.desktop_products p
      on p.business_id=l.business_id and p.id=l.product_id
    where l.business_id=target_business_id
      and l.sale_id=outbox_record.sale_id
      and (p.id is null or p.local_business_public_id<>source_business_public_id)
  ) then
    raise exception 'Sale is not owned by this desktop source' using errcode='42501';
  end if;

  select * into receipt from private.web_pos_desktop_apply_receipts r
    where r.event_id=target_event_id;
  if found then
    if receipt.business_id<>target_business_id
       or receipt.source_business_public_id<>source_business_public_id
       or receipt.device_public_id<>source_device_public_id
       or receipt.local_sale_id<>local_sale_id then
      raise exception 'Conflicting desktop application acknowledgement'
        using errcode='23505';
    end if;
    return target_event_id;
  end if;

  insert into private.web_pos_desktop_apply_receipts(
    event_id,business_id,source_business_public_id,device_public_id,
    local_sale_id,ack_request_id
  ) values (
    target_event_id,target_business_id,source_business_public_id,
    source_device_public_id,local_sale_id,ack_request_id
  );
  update private.web_pos_reconciliation_outbox
    set status='desktop_applied',applied_at=now(),
      applied_by_device=source_device_public_id
    where id=target_event_id and business_id=target_business_id
      and status in ('pending','delivering');
  update private.web_pos_sales s set status='desktop_applied'
    where s.business_id=target_business_id and s.id=outbox_record.sale_id
      and status='pending_desktop';

  -- Deliberately do not release web_pos_stock_holds here. A desktop ACK
  -- alone cannot prove that its stock movement has reached the hosted replay.
  return target_event_id;
end;
$$;

revoke all on function public.ack_applied_web_pos_sale(uuid,text,uuid,uuid,bigint,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.ack_applied_web_pos_sale(uuid,text,uuid,uuid,bigint,uuid)
 to authenticated;
