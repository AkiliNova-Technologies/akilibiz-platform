-- Independently gated web -> desktop supplier-payment review commands.
-- Hosted state never changes payable balances or posts accounting entries.
create table private.desktop_supplier_payment_request_controls(
 business_id uuid primary key references public.businesses(id) on delete restrict,
 requests_enabled boolean not null default false
);
create table private.desktop_supplier_payment_requests(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_id uuid not null,
 requested_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null,
 source_device_public_id uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=32768),
 payload_digest text not null,
 state text not null default 'pending' check(state in ('pending','applied','rejected')),
 decision_reason text check(decision_reason is null or char_length(decision_reason)<=500),
 result jsonb check(result is null or (jsonb_typeof(result)='object' and pg_column_size(result)<=32768)),
 created_at timestamptz not null default now(),decided_at timestamptz,
 unique(business_id,requested_by,request_id),
 check((state='pending' and decided_at is null and result is null) or
  (state='applied' and decided_at is not null and result is not null) or
  (state='rejected' and decided_at is not null and result is null and decision_reason is not null))
);
create index desktop_supplier_payment_queue_idx on private.desktop_supplier_payment_requests
 (business_id,source_business_public_id,source_device_public_id,created_at,id) where state='pending';
alter table private.desktop_supplier_payment_request_controls enable row level security;
alter table private.desktop_supplier_payment_request_controls force row level security;
alter table private.desktop_supplier_payment_requests enable row level security;
alter table private.desktop_supplier_payment_requests force row level security;
revoke all on private.desktop_supplier_payment_request_controls,
 private.desktop_supplier_payment_requests from public,anon,authenticated,service_role;

create function public.request_desktop_supplier_payment_review(
 target_business_id uuid,request_id uuid,source_business_public_id text,
 payment_ref text,payment_date date,payment_method text,notes text,allocations jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); device uuid; item jsonb; payable jsonb;
 supplier_id bigint; item_supplier bigint; payable_id bigint; amount bigint; total numeric:=0;
 normalized jsonb; digest text; previous private.desktop_supplier_payment_requests%rowtype; command uuid;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
  raise exception 'Business owner access required' using errcode='42501'; end if;
 if not exists(select 1 from private.desktop_supplier_payment_request_controls c
  where c.business_id=target_business_id and c.requests_enabled) then
  raise exception 'Supplier payment requests are disabled' using errcode='55000'; end if;
 if request_id is null or substring(request_id::text from 15 for 1)<>'4' or
  char_length(btrim(payment_ref)) not between 1 and 100 or payment_ref~'[[:cntrl:]]' or
  payment_method not in ('Cash','Bank Transfer','Cheque') or
  notes is not null and (char_length(notes)>1000 or notes~E'\\x00') or
  jsonb_typeof(allocations)<>'array' or jsonb_array_length(allocations) not between 1 and 100 or
 pg_column_size(allocations)>16384 then raise exception 'Invalid supplier payment request' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(allocations) x
   group by x->>'supplier_payable_id' having count(*)>1) then
   raise exception 'A payable may only be allocated once' using errcode='22023'; end if;
 select d.device_public_id into device from private.desktop_devices d
  where d.business_id=target_business_id and d.local_business_public_id=source_business_public_id
   and d.paired_by=actor and d.revoked_at is null order by d.paired_at,d.id limit 1;
 if device is null then raise exception 'No active paired desktop' using errcode='42501'; end if;
 for item in select value from jsonb_array_elements(allocations) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or
   not(item ?& array['supplier_payable_id','amount_ugx']) or
   (item->>'supplier_payable_id')!~'^[1-9][0-9]*$' or (item->>'amount_ugx')!~'^[1-9][0-9]*$' then
   raise exception 'Invalid payable allocation' using errcode='22023'; end if;
  payable_id:=(item->>'supplier_payable_id')::bigint; amount:=(item->>'amount_ugx')::bigint;
  select r.record into payable from public.desktop_business_records r
   where r.business_id=target_business_id and r.local_business_public_id=source_business_public_id
    and r.entity_type='supplier_payables' and r.local_record_id=payable_id;
  if payable is null or payable->>'status' not in ('open','partial') or
   (payable->>'supplier_id')!~'^[1-9][0-9]*$' or
   (payable->>'outstanding_amount_ugx')!~'^[1-9][0-9]*$' or
   amount>(payable->>'outstanding_amount_ugx')::bigint then
   raise exception 'Payable is no longer eligible' using errcode='23503'; end if;
  item_supplier:=(payable->>'supplier_id')::bigint;
  if supplier_id is null then supplier_id:=item_supplier; elsif supplier_id<>item_supplier then
   raise exception 'Allocations must belong to one supplier' using errcode='22023'; end if;
  total:=total+amount; if total>9007199254740991 then raise exception 'Payment exceeds exact UGX range' using errcode='22003'; end if;
 end loop;
 normalized:=jsonb_build_object('payment_ref',btrim(payment_ref),'supplier_id',supplier_id,
  'amount_ugx',total::bigint,'payment_date',to_char(payment_date,'YYYY-MM-DD'),
  'payment_method',payment_method,'notes',nullif(btrim(notes),''),'allocations',allocations);
 digest:=encode(sha256(convert_to(normalized::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('supplier-payment:'||target_business_id::text||':'||request_id::text,0));
 select * into previous from private.desktop_supplier_payment_requests r
  where r.business_id=target_business_id and r.requested_by=actor
   and r.request_id=request_desktop_supplier_payment_review.request_id;
 if found then if previous.payload_digest<>digest then raise exception 'Request identity was reused with changed payment details' using errcode='23505'; end if; return previous.id; end if;
 insert into private.desktop_supplier_payment_requests(business_id,request_id,requested_by,
  source_business_public_id,source_device_public_id,payload,payload_digest)
 values(target_business_id,request_id,actor,source_business_public_id,device,normalized,digest)
 returning id into command; return command;
end $$;

create function public.list_desktop_supplier_payment_statuses(target_business_id uuid)
returns table(command_id uuid,request_id uuid,state text,reason text,result jsonb,requested_at timestamptz,decided_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 if not private.is_active_business_owner(target_business_id) then raise exception 'Owner access required' using errcode='42501'; end if;
 return query select r.id,r.request_id,r.state,r.decision_reason,r.result,r.created_at,r.decided_at
 from private.desktop_supplier_payment_requests r where r.business_id=target_business_id
  and r.requested_by=(select auth.uid()) order by r.created_at desc,r.id desc limit 100;
end $$;

create function public.list_pending_desktop_supplier_payment_reviews(target_business_id uuid,
 source_business_public_id text,source_device_public_id uuid,batch_limit integer default 20)
returns table(command_id uuid,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if batch_limit is null or batch_limit<1 or batch_limit>20 then raise exception 'Invalid batch limit' using errcode='22023'; end if;
 if not exists(select 1 from private.desktop_supplier_payment_request_controls c where c.business_id=target_business_id and c.requests_enabled) then return; end if;
 return query select r.id,r.payload,r.created_at from private.desktop_supplier_payment_requests r
 where r.business_id=target_business_id and r.source_business_public_id=list_pending_desktop_supplier_payment_reviews.source_business_public_id
  and r.source_device_public_id=list_pending_desktop_supplier_payment_reviews.source_device_public_id and r.state='pending'
 order by r.created_at,r.id limit batch_limit;
end $$;

create function public.verify_pending_desktop_supplier_payment(target_business_id uuid,
 source_business_public_id text,source_device_public_id uuid,command_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 return exists(select 1 from private.desktop_supplier_payment_requests r join private.desktop_supplier_payment_request_controls c using(business_id)
  where r.business_id=target_business_id and r.id=command_id and r.state='pending' and c.requests_enabled
   and r.source_business_public_id=verify_pending_desktop_supplier_payment.source_business_public_id
   and r.source_device_public_id=verify_pending_desktop_supplier_payment.source_device_public_id);
end $$;

create function public.acknowledge_desktop_supplier_payment(target_business_id uuid,
 source_business_public_id text,source_device_public_id uuid,command_id uuid,payment_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$ declare current private.desktop_supplier_payment_requests%rowtype; begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if jsonb_typeof(payment_result)<>'object' or pg_column_size(payment_result)>32768 or
  not(payment_result ?& array['payment_public_id','payment_ref','supplier_id','amount_ugx','allocations']) then
  raise exception 'Invalid payment acknowledgement' using errcode='22023'; end if;
 select * into current from private.desktop_supplier_payment_requests r where r.business_id=target_business_id and r.id=command_id
  and r.source_business_public_id=acknowledge_desktop_supplier_payment.source_business_public_id
  and r.source_device_public_id=acknowledge_desktop_supplier_payment.source_device_public_id for update;
 if not found then raise exception 'Payment request not found' using errcode='42501'; end if;
 if current.state='applied' then return current.result=payment_result; end if;
 if current.state<>'pending' then return false; end if;
 update private.desktop_supplier_payment_requests set state='applied',result=payment_result,decided_at=now()
  where business_id=target_business_id and id=command_id; return true;
end $$;

create function public.reject_desktop_supplier_payment(target_business_id uuid,
 source_business_public_id text,source_device_public_id uuid,command_id uuid,rejection_reason text) returns boolean
language plpgsql security definer set search_path='' as $$ declare current private.desktop_supplier_payment_requests%rowtype; begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if char_length(btrim(rejection_reason)) not between 1 and 500 then raise exception 'Rejection reason required' using errcode='22023'; end if;
 select * into current from private.desktop_supplier_payment_requests r where r.business_id=target_business_id and r.id=command_id
  and r.source_business_public_id=reject_desktop_supplier_payment.source_business_public_id
  and r.source_device_public_id=reject_desktop_supplier_payment.source_device_public_id for update;
 if not found then raise exception 'Payment request not found' using errcode='42501'; end if;
 if current.state='rejected' then return current.decision_reason=btrim(rejection_reason); end if;
 if current.state<>'pending' then return false; end if;
 update private.desktop_supplier_payment_requests set state='rejected',decision_reason=btrim(rejection_reason),decided_at=now()
  where business_id=target_business_id and id=command_id; return true;
end $$;

revoke all on function public.request_desktop_supplier_payment_review(uuid,uuid,text,text,date,text,text,jsonb),
 public.list_desktop_supplier_payment_statuses(uuid),public.list_pending_desktop_supplier_payment_reviews(uuid,text,uuid,integer),
 public.verify_pending_desktop_supplier_payment(uuid,text,uuid,uuid),
 public.acknowledge_desktop_supplier_payment(uuid,text,uuid,uuid,jsonb),
 public.reject_desktop_supplier_payment(uuid,text,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_supplier_payment_review(uuid,uuid,text,text,date,text,text,jsonb),
 public.list_desktop_supplier_payment_statuses(uuid),public.list_pending_desktop_supplier_payment_reviews(uuid,text,uuid,integer),
 public.verify_pending_desktop_supplier_payment(uuid,text,uuid,uuid),
 public.acknowledge_desktop_supplier_payment(uuid,text,uuid,uuid,jsonb),
 public.reject_desktop_supplier_payment(uuid,text,uuid,uuid,text) to authenticated;
