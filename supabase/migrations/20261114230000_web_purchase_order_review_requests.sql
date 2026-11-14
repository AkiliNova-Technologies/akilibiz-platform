-- Web -> desktop purchase order review, independently gated and DEFAULT OFF.
-- This migration creates immutable REQUESTS ONLY, never purchase orders,
-- goods receipts, supplier payables, journal entries or stock movements.
create table private.desktop_purchase_order_request_controls (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 requests_enabled boolean not null default false
);
create table private.desktop_purchase_order_requests (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_id uuid not null,
 draft_id uuid not null,
 requested_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null,
 source_device_public_id uuid not null,
 supplier_public_id uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=24576),
 state text not null default 'pending' check(state in ('pending','staged','applied','conflict')),
 created_at timestamptz not null default now(),
 unique(business_id,requested_by,request_id),
 unique(business_id,draft_id)
);
create index desktop_purchase_order_request_queue_idx
 on private.desktop_purchase_order_requests
 (business_id,source_business_public_id,source_device_public_id,created_at,id)
 where state='pending';
alter table private.desktop_purchase_order_request_controls enable row level security;
alter table private.desktop_purchase_order_request_controls force row level security;
alter table private.desktop_purchase_order_requests enable row level security;
alter table private.desktop_purchase_order_requests force row level security;
revoke all on private.desktop_purchase_order_request_controls,
 private.desktop_purchase_order_requests from public,anon,authenticated,service_role;

create function public.request_desktop_purchase_order_review(
 target_business_id uuid,target_draft_id uuid,request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=(select auth.uid());
 draft public.web_purchase_order_drafts%rowtype;
 supplier public.desktop_suppliers%rowtype;
 device uuid;
 previous private.desktop_purchase_order_requests%rowtype;
 line jsonb;
 product public.desktop_products%rowtype;
 converted_lines jsonb:='[]'::jsonb;
 request_payload jsonb;
 result_id uuid;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
  raise exception 'Business owner access required' using errcode='42501';
 end if;
 if not exists(select 1 from private.desktop_purchase_order_request_controls x
   where x.business_id=target_business_id and x.requests_enabled) then
  raise exception 'Purchase order requests are disabled' using errcode='55000';
 end if;
 if target_draft_id is null or request_id is null or
  substring(request_id::text from 15 for 1)<>'4' then
  raise exception 'Invalid request identity' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(
  'akilibiz-purchase-request:'||target_business_id::text||':'||target_draft_id::text,0));
 select * into previous from private.desktop_purchase_order_requests c
  where c.business_id=target_business_id and c.draft_id=target_draft_id;
 if found then
  if previous.request_id<>request_id or previous.requested_by<>actor then
   raise exception 'This purchase order was already requested' using errcode='23505';
  end if;
  return previous.id;
 end if;
 select * into draft from public.web_purchase_order_drafts d
  where d.id=target_draft_id and d.business_id=target_business_id
   and d.created_by=actor for update;
 if not found then
  raise exception 'Purchase order draft not found for owner' using errcode='42501';
 end if;
 select * into supplier from public.desktop_suppliers s
  where s.id=draft.supplier_id and s.business_id=target_business_id
   and s.is_active and s.local_business_public_id=draft.source_business_public_id;
 if not found then
  raise exception 'Supplier source is no longer available' using errcode='23503';
 end if;
 select d.device_public_id into device from private.desktop_devices d
  where d.business_id=target_business_id
   and d.local_business_public_id=draft.source_business_public_id
   and d.paired_by=actor and d.revoked_at is null
  order by d.paired_at,d.id limit 1;
 if device is null then
  raise exception 'No active paired desktop for this supplier' using errcode='42501';
 end if;
 -- Recheck lines against source products to prevent submitting stale drafts.
 for line in select value from jsonb_array_elements(draft.lines) loop
  select * into product from public.desktop_products p
   where p.id=(line->>'product_id')::uuid
     and p.business_id=target_business_id and p.is_active
     and p.local_business_public_id=draft.source_business_public_id;
  if not found then
    raise exception 'Purchase order product is no longer available' using errcode='23503';
  end if;
  converted_lines:=converted_lines||jsonb_build_array(jsonb_build_object(
   'product_id',product.local_product_id,
   'quantity_milli',(line->>'quantity_milli')::bigint,
   'unit_price_ugx',(line->>'unit_price_ugx')::bigint
  ));
 end loop;
 if jsonb_array_length(converted_lines)<1 then
  raise exception 'A purchase order needs at least one item' using errcode='22023';
 end if;
 request_payload:=jsonb_build_object(
  'po_number',draft.po_number,
  'supplier_public_id',supplier.source_public_id,
  'order_date',to_char(draft.order_date,'YYYY-MM-DD'),
  'expected_delivery',case when draft.expected_delivery is null then null
    else to_char(draft.expected_delivery,'YYYY-MM-DD') end,
  'notes',draft.notes,'lines',converted_lines
 );
 insert into private.desktop_purchase_order_requests(
  business_id,request_id,draft_id,requested_by,
  source_business_public_id,source_device_public_id,supplier_public_id,payload
 ) values(
  target_business_id,request_id,target_draft_id,actor,
  draft.source_business_public_id,device,supplier.source_public_id,request_payload
 ) returning id into result_id;
 return result_id;
end $$;

create function public.list_desktop_purchase_order_review_statuses(
 target_business_id uuid
) returns table(command_id uuid,draft_id uuid,state text,requested_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_active_business_owner(target_business_id) then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 return query select c.id,c.draft_id,c.state,c.created_at
  from private.desktop_purchase_order_requests c
  where c.business_id=target_business_id and c.requested_by=(select auth.uid())
  order by c.created_at desc,c.id desc limit 100;
end $$;

-- Devices can only read requests addressed to their paired desktop source.
-- An independent desktop inbox implementation must be qualified before use.
create function public.list_pending_desktop_purchase_order_reviews(
 target_business_id uuid,source_business_public_id text,
 source_device_public_id uuid,batch_limit integer default 20
) returns table(command_id uuid,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_desktop_inventory_source(
  target_business_id,source_business_public_id,source_device_public_id);
 if batch_limit is null or batch_limit<1 or batch_limit>20 then
  raise exception 'Invalid purchase review batch limit' using errcode='22023';
 end if;
 if not exists(select 1 from private.desktop_purchase_order_request_controls x
   where x.business_id=target_business_id and x.requests_enabled) then return;
 end if;
 return query select c.id,c.payload,c.created_at
 from private.desktop_purchase_order_requests c
 where c.business_id=target_business_id
   and c.source_business_public_id=list_pending_desktop_purchase_order_reviews.source_business_public_id
   and c.source_device_public_id=list_pending_desktop_purchase_order_reviews.source_device_public_id
   and c.state='pending'
 order by c.created_at,c.id limit batch_limit;
end $$;

-- No direct draft edits/deletion once a server-snapshotted review exists.
create function private.freeze_requested_purchase_order_draft()
returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from private.desktop_purchase_order_requests c
  where c.business_id=old.business_id and c.draft_id=old.id) then
  raise exception 'This purchase order was already submitted for desktop review'
   using errcode='55000';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function private.freeze_requested_purchase_order_draft()
 from public,anon,authenticated,service_role;
create trigger freeze_requested_purchase_order_update before update on
 public.web_purchase_order_drafts for each row
 execute function private.freeze_requested_purchase_order_draft();
create trigger freeze_requested_purchase_order_delete before delete on
 public.web_purchase_order_drafts for each row
 execute function private.freeze_requested_purchase_order_draft();

revoke all on function public.request_desktop_purchase_order_review(uuid,uuid,uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.list_desktop_purchase_order_review_statuses(uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.list_pending_desktop_purchase_order_reviews(uuid,text,uuid,integer)
 from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_purchase_order_review(uuid,uuid,uuid)
 to authenticated;
grant execute on function public.list_desktop_purchase_order_review_statuses(uuid)
 to authenticated;
grant execute on function public.list_pending_desktop_purchase_order_reviews(uuid,text,uuid,integer)
 to authenticated;
