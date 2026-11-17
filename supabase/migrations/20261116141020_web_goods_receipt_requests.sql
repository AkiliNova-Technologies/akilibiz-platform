-- Web-prepared goods receipts become immutable, device-addressed review commands.
-- All gates default off. Only the desktop may post stock, payables, VAT evidence,
-- and accounting entries through its existing goods-receipt service.
create table private.desktop_goods_receipt_request_controls(
 business_id uuid primary key references public.businesses(id) on delete restrict,
 requests_enabled boolean not null default false
);

create table private.desktop_goods_receipt_requests(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_id uuid not null,
 draft_id uuid not null,
 requested_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null,
 source_device_public_id uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=32768),
 state text not null default 'pending' check(state in ('pending','applied','rejected')),
 decision_reason text check(decision_reason is null or char_length(decision_reason)<=500),
 decided_at timestamptz,
 receipt_public_id uuid,
 receipt_number text,
 payable_id bigint,
 created_at timestamptz not null default now(),
 unique(business_id,requested_by,request_id),
 unique(business_id,draft_id),
 foreign key(business_id,draft_id) references
  public.web_goods_receipt_drafts(business_id,id) on delete restrict,
 check((state='pending' and decided_at is null and receipt_public_id is null) or
       (state='applied' and decided_at is not null and receipt_public_id is not null and
        receipt_number is not null and payable_id is not null) or
       (state='rejected' and decided_at is not null and receipt_public_id is null and
        receipt_number is null and payable_id is null))
);
create index desktop_goods_receipt_request_queue_idx
 on private.desktop_goods_receipt_requests
 (business_id,source_business_public_id,source_device_public_id,created_at,id)
 where state='pending';
alter table private.desktop_goods_receipt_request_controls enable row level security;
alter table private.desktop_goods_receipt_request_controls force row level security;
alter table private.desktop_goods_receipt_requests enable row level security;
alter table private.desktop_goods_receipt_requests force row level security;
revoke all on private.desktop_goods_receipt_request_controls,
 private.desktop_goods_receipt_requests from public,anon,authenticated,service_role;

create function public.request_desktop_goods_receipt_review(
 target_business_id uuid,target_draft_id uuid,request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=(select auth.uid());
 draft public.web_goods_receipt_drafts%rowtype;
 device uuid;
 previous private.desktop_goods_receipt_requests%rowtype;
 po jsonb;
 request_payload jsonb;
 result_id uuid;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
  raise exception 'Business owner access required' using errcode='42501';
 end if;
 if not exists(select 1 from private.desktop_goods_receipt_request_controls x
   where x.business_id=target_business_id and x.requests_enabled) then
  raise exception 'Goods receipt requests are disabled' using errcode='55000';
 end if;
 if target_draft_id is null or request_id is null or
  substring(request_id::text from 15 for 1)<>'4' then
  raise exception 'Invalid request identity' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(
  'akilibiz-goods-receipt-request:'||target_business_id::text||':'||target_draft_id::text,0));
 select * into previous from private.desktop_goods_receipt_requests c
  where c.business_id=target_business_id and c.draft_id=target_draft_id;
 if found then
  if previous.request_id<>request_id or previous.requested_by<>actor then
   raise exception 'This goods receipt was already requested' using errcode='23505';
  end if;
  return previous.id;
 end if;
 select * into draft from public.web_goods_receipt_drafts d
  where d.id=target_draft_id and d.business_id=target_business_id
   and d.created_by=actor for update;
 if not found then
  raise exception 'Goods receipt draft not found for owner' using errcode='42501';
 end if;
 select r.record into po from public.desktop_business_records r
  where r.business_id=target_business_id
   and r.local_business_public_id=draft.source_business_public_id
   and r.entity_type='purchase_orders' and r.local_record_id=draft.purchase_order_id;
 if po is null or po->>'status' not in ('Pending','Partially Received') or
    (po->>'supplier_id') !~ '^[1-9][0-9]*$' then
  raise exception 'Purchase order is no longer available for receiving' using errcode='23503';
 end if;
 select d.device_public_id into device from private.desktop_devices d
  where d.business_id=target_business_id
   and d.local_business_public_id=draft.source_business_public_id
   and d.paired_by=actor and d.revoked_at is null
  order by d.paired_at,d.id limit 1;
 if device is null then
  raise exception 'No active paired desktop for this receipt' using errcode='42501';
 end if;
 request_payload:=jsonb_build_object(
  'receipt_number',draft.receipt_number,
  'supplier_id',(po->>'supplier_id')::bigint,
  'purchase_order_id',draft.purchase_order_id,
  'receipt_date',to_char(draft.receipt_date,'YYYY-MM-DD'),
  'supplier_reference',draft.supplier_reference,
  'due_date',case when draft.due_date is null then null else to_char(draft.due_date,'YYYY-MM-DD') end,
  'lines',draft.lines,'supplier_vat',draft.supplier_vat
 );
 insert into private.desktop_goods_receipt_requests(
  business_id,request_id,draft_id,requested_by,source_business_public_id,
  source_device_public_id,payload
 ) values(target_business_id,request_id,target_draft_id,actor,
  draft.source_business_public_id,device,request_payload) returning id into result_id;
 return result_id;
end $$;

create function public.list_desktop_goods_receipt_statuses(target_business_id uuid)
returns table(command_id uuid,draft_id uuid,state text,reason text,
 receipt_public_id uuid,receipt_number text,requested_at timestamptz,decided_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_active_business_owner(target_business_id) then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 return query select c.id,c.draft_id,c.state,c.decision_reason,c.receipt_public_id,
  c.receipt_number,c.created_at,c.decided_at
 from private.desktop_goods_receipt_requests c
 where c.business_id=target_business_id and c.requested_by=(select auth.uid())
 order by c.created_at desc,c.id desc limit 100;
end $$;

create function public.list_pending_desktop_goods_receipt_reviews(
 target_business_id uuid,source_business_public_id text,
 source_device_public_id uuid,batch_limit integer default 20
) returns table(command_id uuid,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_desktop_inventory_source(target_business_id,
  source_business_public_id,source_device_public_id);
 if batch_limit is null or batch_limit<1 or batch_limit>20 then
  raise exception 'Invalid goods receipt batch limit' using errcode='22023';
 end if;
 if not exists(select 1 from private.desktop_goods_receipt_request_controls x
   where x.business_id=target_business_id and x.requests_enabled) then return; end if;
 return query select c.id,c.payload,c.created_at
 from private.desktop_goods_receipt_requests c
 where c.business_id=target_business_id
  and c.source_business_public_id=list_pending_desktop_goods_receipt_reviews.source_business_public_id
  and c.source_device_public_id=list_pending_desktop_goods_receipt_reviews.source_device_public_id
  and c.state='pending' order by c.created_at,c.id limit batch_limit;
end $$;

create function public.verify_pending_desktop_goods_receipt(
 target_business_id uuid,source_business_public_id text,
 source_device_public_id uuid,command_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_desktop_inventory_source(target_business_id,
  source_business_public_id,source_device_public_id);
 return exists(select 1 from private.desktop_goods_receipt_requests c
  join private.desktop_goods_receipt_request_controls x using(business_id)
  where c.business_id=target_business_id and c.id=command_id and c.state='pending'
   and x.requests_enabled and c.source_business_public_id=verify_pending_desktop_goods_receipt.source_business_public_id
   and c.source_device_public_id=verify_pending_desktop_goods_receipt.source_device_public_id);
end $$;

create function public.acknowledge_desktop_goods_receipt(
 target_business_id uuid,source_business_public_id text,source_device_public_id uuid,
 command_id uuid,posted_receipt_public_id uuid,posted_receipt_number text,posted_payable_id bigint
) returns boolean language plpgsql security definer set search_path='' as $$
declare current private.desktop_goods_receipt_requests%rowtype;
begin
 perform private.require_desktop_inventory_source(target_business_id,
  source_business_public_id,source_device_public_id);
 if posted_receipt_public_id is null or posted_payable_id<=0 or
    char_length(btrim(posted_receipt_number)) not between 1 and 100 then
  raise exception 'Invalid goods receipt acknowledgement' using errcode='22023'; end if;
 select * into current from private.desktop_goods_receipt_requests c
  where c.business_id=target_business_id and c.id=command_id
   and c.source_business_public_id=acknowledge_desktop_goods_receipt.source_business_public_id
   and c.source_device_public_id=acknowledge_desktop_goods_receipt.source_device_public_id for update;
 if not found then raise exception 'Goods receipt request not found' using errcode='42501'; end if;
 if current.state='applied' then
  return current.receipt_public_id=posted_receipt_public_id and
   current.receipt_number=posted_receipt_number and current.payable_id=posted_payable_id;
 end if;
 if current.state<>'pending' then return false; end if;
 update private.desktop_goods_receipt_requests set state='applied',decided_at=now(),
  receipt_public_id=posted_receipt_public_id,receipt_number=posted_receipt_number,
  payable_id=posted_payable_id where business_id=target_business_id and id=command_id;
 return true;
end $$;

create function public.reject_desktop_goods_receipt(
 target_business_id uuid,source_business_public_id text,source_device_public_id uuid,
 command_id uuid,rejection_reason text
) returns boolean language plpgsql security definer set search_path='' as $$
declare current private.desktop_goods_receipt_requests%rowtype;
begin
 perform private.require_desktop_inventory_source(target_business_id,
  source_business_public_id,source_device_public_id);
 if char_length(btrim(rejection_reason)) not between 1 and 500 then
  raise exception 'Rejection reason is required' using errcode='22023'; end if;
 select * into current from private.desktop_goods_receipt_requests c
  where c.business_id=target_business_id and c.id=command_id
   and c.source_business_public_id=reject_desktop_goods_receipt.source_business_public_id
   and c.source_device_public_id=reject_desktop_goods_receipt.source_device_public_id for update;
 if not found then raise exception 'Goods receipt request not found' using errcode='42501'; end if;
 if current.state='rejected' then return current.decision_reason=btrim(rejection_reason); end if;
 if current.state<>'pending' then return false; end if;
 update private.desktop_goods_receipt_requests set state='rejected',decided_at=now(),
  decision_reason=btrim(rejection_reason) where business_id=target_business_id and id=command_id;
 return true;
end $$;

create function private.freeze_requested_goods_receipt_draft()
returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from private.desktop_goods_receipt_requests c
  where c.business_id=old.business_id and c.draft_id=old.id) then
  raise exception 'This goods receipt was already submitted for desktop review' using errcode='55000';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.freeze_requested_goods_receipt_draft()
 from public,anon,authenticated,service_role;
create trigger freeze_requested_goods_receipt_update before update on
 public.web_goods_receipt_drafts for each row execute function private.freeze_requested_goods_receipt_draft();
create trigger freeze_requested_goods_receipt_delete before delete on
 public.web_goods_receipt_drafts for each row execute function private.freeze_requested_goods_receipt_draft();

revoke all on function public.request_desktop_goods_receipt_review(uuid,uuid,uuid),
 public.list_desktop_goods_receipt_statuses(uuid),
 public.list_pending_desktop_goods_receipt_reviews(uuid,text,uuid,integer),
 public.verify_pending_desktop_goods_receipt(uuid,text,uuid,uuid),
 public.acknowledge_desktop_goods_receipt(uuid,text,uuid,uuid,uuid,text,bigint),
 public.reject_desktop_goods_receipt(uuid,text,uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_goods_receipt_review(uuid,uuid,uuid),
 public.list_desktop_goods_receipt_statuses(uuid),
 public.list_pending_desktop_goods_receipt_reviews(uuid,text,uuid,integer),
 public.verify_pending_desktop_goods_receipt(uuid,text,uuid,uuid),
 public.acknowledge_desktop_goods_receipt(uuid,text,uuid,uuid,uuid,text,bigint),
 public.reject_desktop_goods_receipt(uuid,text,uuid,uuid,text) to authenticated;
