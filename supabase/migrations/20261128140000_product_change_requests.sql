-- Web -> desktop product edit and deactivation requests (default off).
--
-- The web Products screen (the desktop's own screen) edits and deactivates
-- products by asking the paired desktop. Hosted state is a review queue only:
-- the desktop stages each request, a staff member approves or rejects it, and
-- an approved change runs through the desktop's own product update (its
-- permission check and validation). Each request carries the product as the
-- web last saw it ("expected"); the desktop refuses the change when the
-- product has changed there since, so a stale web view never overwrites
-- desktop data.

create table private.desktop_product_change_controls(
 business_id uuid primary key references public.businesses(id) on delete restrict,
 update_enabled boolean not null default false,
 deactivate_enabled boolean not null default false
);
create table private.desktop_product_change_commands(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_id uuid not null, requested_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null, source_device_public_id uuid not null,
 operation text not null check(operation in ('update','deactivate')),
 local_product_id bigint not null check(local_product_id>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=16384),
 payload_digest text not null,
 state text not null default 'pending' check(state in ('pending','applied','rejected')),
 decision_reason text check(decision_reason is null or char_length(decision_reason)<=500),
 result jsonb check(result is null or (jsonb_typeof(result)='object' and pg_column_size(result)<=16384)),
 created_at timestamptz not null default now(), decided_at timestamptz,
 unique(business_id,requested_by,request_id),
 check((state='pending' and decided_at is null and result is null)
    or (state='applied' and decided_at is not null and result is not null)
    or (state='rejected' and decided_at is not null and result is null and decision_reason is not null))
);
create index desktop_product_change_pending_idx on private.desktop_product_change_commands
 (business_id,source_business_public_id,source_device_public_id,created_at,id) where state='pending';
alter table private.desktop_product_change_controls enable row level security;
alter table private.desktop_product_change_controls force row level security;
alter table private.desktop_product_change_commands enable row level security;
alter table private.desktop_product_change_commands force row level security;
revoke all on private.desktop_product_change_controls,private.desktop_product_change_commands
 from public,anon,authenticated,service_role;

-- The synchronized product as the web shows it, in the desktop's cloud
-- catalogue shape (desktop CLOUD_PRODUCT_JSON), for the desktop's stale check.
create function private.synced_product_expectation(target_business_id uuid,source text,product bigint)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object(
   'id',p.local_product_id,'category_id',c.local_category_id,'name',p.name,'sku',p.sku,
   'barcode',p.barcode,'description',p.description,'brand',p.brand,'stock_unit',p.stock_unit,
   'selling_price_ugx',p.selling_price_ugx,'cost_price_ugx',p.cost_price_ugx,'active',p.is_active,
   'sales_unit',p.sales_unit,'allow_decimal_quantity',p.allow_decimal_quantity,'tax_inclusive',p.tax_inclusive))
   || case when p.details is null then '{}'::jsonb else jsonb_build_object('details',p.details) end
 from public.desktop_products p
 join public.desktop_categories c on c.id=p.category_id and c.business_id=p.business_id
 where p.business_id=target_business_id and p.local_business_public_id=source and p.local_product_id=product
$$;

create function private.enqueue_product_change(target_business_id uuid,request_id uuid,
  source_business_public_id text,command_operation text,product_id bigint,changes jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); device uuid; digest text; command uuid; enabled boolean;
  prior private.desktop_product_change_commands%rowtype; expected jsonb; payload jsonb;
begin
 if actor is null or not private.is_active_business_owner(target_business_id) then
  raise exception 'Business owner access required' using errcode='42501'; end if;
 if request_id is null or substring(request_id::text from 15 for 1)<>'4' or product_id is null or product_id<=0
    or command_operation not in ('update','deactivate') then
  raise exception 'Invalid product change' using errcode='22023'; end if;
 select case command_operation when 'update' then x.update_enabled else x.deactivate_enabled end into enabled
   from private.desktop_product_change_controls x where x.business_id=target_business_id;
 if not coalesce(enabled,false) then raise exception 'Product changes are disabled' using errcode='55000'; end if;
 select d.device_public_id into device from private.desktop_devices d
  where d.business_id=target_business_id and d.local_business_public_id=source_business_public_id
    and d.paired_by=actor and d.revoked_at is null order by d.paired_at,d.id limit 1;
 if device is null then raise exception 'No active paired desktop' using errcode='42501'; end if;
 expected:=private.synced_product_expectation(target_business_id,source_business_public_id,product_id);
 if expected is null then raise exception 'Product is not synchronized' using errcode='23503'; end if;
 if command_operation='deactivate' and not coalesce((expected->>'active')::boolean,false) then
  raise exception 'Product is already inactive' using errcode='23503'; end if;
 payload:=jsonb_build_object('product_id',product_id,'expected',expected)
   || case when command_operation='update' then jsonb_build_object('changes',changes) else '{}'::jsonb end;
 if pg_column_size(payload)>16384 then raise exception 'Product change is too large' using errcode='22023'; end if;
 digest:=encode(sha256(convert_to(command_operation||':'||product_id||':'||coalesce(changes::text,''),'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('product-change:'||target_business_id::text||':'||request_id::text,0));
 select * into prior from private.desktop_product_change_commands c
  where c.business_id=target_business_id and c.requested_by=actor and c.request_id=enqueue_product_change.request_id;
 if found then
  if prior.operation<>command_operation or prior.payload_digest<>digest then
   raise exception 'Request identity reused with changed product details' using errcode='23505'; end if;
  return prior.id;
 end if;
 insert into private.desktop_product_change_commands(business_id,request_id,requested_by,source_business_public_id,
   source_device_public_id,operation,local_product_id,payload,payload_digest)
 values(target_business_id,request_id,actor,source_business_public_id,device,command_operation,product_id,payload,digest)
 returning id into command;
 return command;
end $$;

-- Edit: the desktop UpdateProductDto fields (desktop validates every value).
create function public.request_desktop_product_update(target_business_id uuid,request_id uuid,
  source_business_public_id text,product_id bigint,changes jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare allowed text[]:=array['name','sku','barcode','brand','category_id','description','product_type',
  'inventory_type','stock_unit','sales_unit','purchase_unit','unit_conversion_factor','pack_size',
  'package_content_quantity','package_content_unit','cost_price','selling_price','wholesale_price',
  'minimum_selling_price','min_stock_level','max_stock_level','allow_decimal_quantity','allow_negative_stock',
  'track_expiry','track_batches','is_taxable','tax_classification_code','tax_inclusive','is_active'];
begin
 if jsonb_typeof(changes)<>'object' or changes='{}'::jsonb
    or exists(select 1 from jsonb_object_keys(changes) k where k<>all(allowed))
    or (changes ? 'name' and (jsonb_typeof(changes->'name')<>'string' or char_length(btrim(changes->>'name')) not between 1 and 200))
    or (changes ? 'sku' and (jsonb_typeof(changes->'sku')<>'string' or char_length(btrim(changes->>'sku')) not between 1 and 160))
    or (changes ? 'category_id' and coalesce(changes->>'category_id','')!~'^[1-9][0-9]{0,17}$')
    or (changes ? 'tax_classification_code' and jsonb_typeof(changes->'tax_classification_code')<>'null'
        and changes->>'tax_classification_code' not in ('STANDARD_RATED','ZERO_RATED','EXEMPT','OUT_OF_SCOPE'))
    or (changes ? 'stock_quantity') then
  raise exception 'Invalid product update' using errcode='22023'; end if;
 return private.enqueue_product_change(target_business_id,request_id,source_business_public_id,'update',product_id,changes);
end $$;

create function public.request_desktop_product_deactivation(target_business_id uuid,request_id uuid,
  source_business_public_id text,product_id bigint)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 return private.enqueue_product_change(target_business_id,request_id,source_business_public_id,'deactivate',product_id,null);
end $$;

create function public.list_desktop_product_change_statuses(target_business_id uuid)
returns table(command_id uuid,request_id uuid,operation text,product_id bigint,state text,reason text,
  requested_at timestamptz,decided_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 if not private.is_active_business_owner(target_business_id) then
  raise exception 'Owner access required' using errcode='42501'; end if;
 return query select c.id,c.request_id,c.operation,c.local_product_id,c.state,c.decision_reason,c.created_at,c.decided_at
  from private.desktop_product_change_commands c
  where c.business_id=target_business_id and c.requested_by=(select auth.uid())
  order by c.created_at desc,c.id desc limit 100;
end $$;

create function public.list_pending_desktop_product_changes(target_business_id uuid,source_business_public_id text,
  source_device_public_id uuid,batch_limit integer default 20)
returns table(command_id uuid,operation text,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if batch_limit not between 1 and 20 then raise exception 'Invalid batch limit' using errcode='22023'; end if;
 return query select c.id,c.operation,c.payload,c.created_at
  from private.desktop_product_change_commands c join private.desktop_product_change_controls x using(business_id)
  where c.business_id=target_business_id
    and c.source_business_public_id=list_pending_desktop_product_changes.source_business_public_id
    and c.source_device_public_id=list_pending_desktop_product_changes.source_device_public_id
    and c.state='pending' and case c.operation when 'update' then x.update_enabled else x.deactivate_enabled end
  order by c.created_at,c.id limit batch_limit;
end $$;

create function public.verify_pending_desktop_product_change(target_business_id uuid,source_business_public_id text,
  source_device_public_id uuid,command_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 return exists(select 1 from private.desktop_product_change_commands c join private.desktop_product_change_controls x using(business_id)
  where c.business_id=target_business_id and c.id=command_id and c.state='pending'
    and c.source_business_public_id=verify_pending_desktop_product_change.source_business_public_id
    and c.source_device_public_id=verify_pending_desktop_product_change.source_device_public_id
    and case c.operation when 'update' then x.update_enabled else x.deactivate_enabled end);
end $$;

create function public.acknowledge_desktop_product_change(target_business_id uuid,source_business_public_id text,
  source_device_public_id uuid,command_id uuid,command_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.desktop_product_change_commands%rowtype; begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if jsonb_typeof(command_result)<>'object' or pg_column_size(command_result)>16384 then
  raise exception 'Invalid result' using errcode='22023'; end if;
 select * into c from private.desktop_product_change_commands x where x.business_id=target_business_id and x.id=command_id
   and x.source_business_public_id=acknowledge_desktop_product_change.source_business_public_id
   and x.source_device_public_id=acknowledge_desktop_product_change.source_device_public_id for update;
 if not found then raise exception 'Command not found' using errcode='42501'; end if;
 if c.state='applied' then return c.result=command_result; end if;
 if c.state<>'pending' then return false; end if;
 update private.desktop_product_change_commands set state='applied',result=command_result,decided_at=now()
  where business_id=target_business_id and id=command_id;
 return true;
end $$;

create function public.reject_desktop_product_change(target_business_id uuid,source_business_public_id text,
  source_device_public_id uuid,command_id uuid,rejection_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.desktop_product_change_commands%rowtype; begin
 perform private.require_desktop_inventory_source(target_business_id,source_business_public_id,source_device_public_id);
 if char_length(btrim(rejection_reason)) not between 1 and 500 then
  raise exception 'Reason required' using errcode='22023'; end if;
 select * into c from private.desktop_product_change_commands x where x.business_id=target_business_id and x.id=command_id
   and x.source_business_public_id=reject_desktop_product_change.source_business_public_id
   and x.source_device_public_id=reject_desktop_product_change.source_device_public_id for update;
 if not found then raise exception 'Command not found' using errcode='42501'; end if;
 if c.state='rejected' then return c.decision_reason=btrim(rejection_reason); end if;
 if c.state<>'pending' then return false; end if;
 update private.desktop_product_change_commands set state='rejected',decision_reason=btrim(rejection_reason),decided_at=now()
  where business_id=target_business_id and id=command_id;
 return true;
end $$;

revoke all on function private.synced_product_expectation(uuid,text,bigint),
 private.enqueue_product_change(uuid,uuid,text,text,bigint,jsonb),
 public.request_desktop_product_update(uuid,uuid,text,bigint,jsonb),
 public.request_desktop_product_deactivation(uuid,uuid,text,bigint),
 public.list_desktop_product_change_statuses(uuid),
 public.list_pending_desktop_product_changes(uuid,text,uuid,integer),
 public.verify_pending_desktop_product_change(uuid,text,uuid,uuid),
 public.acknowledge_desktop_product_change(uuid,text,uuid,uuid,jsonb),
 public.reject_desktop_product_change(uuid,text,uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_product_update(uuid,uuid,text,bigint,jsonb),
 public.request_desktop_product_deactivation(uuid,uuid,text,bigint),
 public.list_desktop_product_change_statuses(uuid),
 public.list_pending_desktop_product_changes(uuid,text,uuid,integer),
 public.verify_pending_desktop_product_change(uuid,text,uuid,uuid),
 public.acknowledge_desktop_product_change(uuid,text,uuid,uuid,jsonb),
 public.reject_desktop_product_change(uuid,text,uuid,uuid,text)
 to authenticated;
