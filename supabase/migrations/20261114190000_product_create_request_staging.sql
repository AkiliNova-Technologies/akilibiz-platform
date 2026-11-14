-- Phase 2C: durable, DEFAULT-OFF request for desktop-authoritative product creation.
-- This migration does not create, publish or mutate any live product.
create table private.desktop_product_create_controls (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  requests_enabled boolean not null default false
);
create table private.desktop_product_create_commands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  request_id uuid not null,
  draft_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  source_business_public_id text not null,
  source_device_public_id uuid not null,
  local_category_id bigint not null check(local_category_id > 0),
  category_id uuid not null,
  payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=8192),
  state text not null default 'pending'
    check(state in ('pending','staged','applied','conflict')),
  created_at timestamptz not null default now(),
  unique (business_id,requested_by,request_id),
  unique (business_id,draft_id)
);
create index desktop_product_create_queue_idx on private.desktop_product_create_commands
  (business_id,source_business_public_id,source_device_public_id,created_at,id)
  where state='pending';
alter table private.desktop_product_create_controls enable row level security;
alter table private.desktop_product_create_controls force row level security;
alter table private.desktop_product_create_commands enable row level security;
alter table private.desktop_product_create_commands force row level security;
revoke all on private.desktop_product_create_controls,private.desktop_product_create_commands
  from public,anon,authenticated,service_role;

-- Draft is copied under a row lock. Do not trust fields submitted by the browser.
create function public.request_desktop_product_create(
  target_business_id uuid, target_draft_id uuid, request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  item public.web_product_drafts%rowtype;
  category public.desktop_categories%rowtype;
  device_id uuid;
  previous private.desktop_product_create_commands%rowtype;
  snapshot jsonb;
  command_id uuid;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Owner access required' using errcode='42501';
  end if;
  if not exists(select 1 from private.desktop_product_create_controls x
     where x.business_id=target_business_id and x.requests_enabled) then
    raise exception 'Product requests are disabled' using errcode='55000';
  end if;
  if target_draft_id is null or request_id is null then
    raise exception 'Invalid request identity' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-product-create:'||target_business_id::text||':'||target_draft_id::text,0));
  select * into previous from private.desktop_product_create_commands c
    where c.business_id=target_business_id and c.draft_id=target_draft_id;
  if found then
    if previous.request_id<>request_id or previous.requested_by<>actor then
      raise exception 'This draft already has a publication request' using errcode='23505';
    end if;
    return previous.id;
  end if;
  select * into item from public.web_product_drafts d
    where d.id=target_draft_id and d.business_id=target_business_id
      and d.created_by=actor for update;
  if not found then
    raise exception 'Your product draft was not found' using errcode='42501';
  end if;
  if jsonb_typeof(item.desktop_options)<>'object' or
    (select count(*) from jsonb_object_keys(item.desktop_options))<>14 or
    not (item.desktop_options ?& array[
      'product_type','inventory_type','sales_unit','purchase_unit',
      'unit_conversion_factor','min_stock_level','max_stock_level',
      'allow_decimal_quantity','allow_negative_stock','track_expiry','track_batches',
      'tax_inclusive','package_content_quantity','package_content_unit'
    ]) then
    raise exception 'Complete product and inventory settings first' using errcode='22023';
  end if;
  -- Validate each option type before numeric casts. A draft can be written
  -- through the RLS-protected table API, bypassing the Next.js parser.
  -- Bad JSON must fail with 22023, never an uncaught numeric cast error.
  if jsonb_typeof(item.desktop_options->'product_type')<>'string'
    or item.desktop_options->>'product_type' not in ('stock_item','service','digital','fee')
    or jsonb_typeof(item.desktop_options->'inventory_type')<>'string'
    or item.desktop_options->>'inventory_type' not in ('count','weight','liquid','length','area','volume')
    or jsonb_typeof(item.desktop_options->'sales_unit')<>'string'
    or coalesce(length(btrim(item.desktop_options->>'sales_unit')),0) not between 1 and 40
    or jsonb_typeof(item.desktop_options->'purchase_unit')<>'string'
    or coalesce(length(btrim(item.desktop_options->>'purchase_unit')),0) not between 1 and 40
    or jsonb_typeof(item.desktop_options->'allow_decimal_quantity')<>'boolean'
    or jsonb_typeof(item.desktop_options->'allow_negative_stock')<>'boolean'
    or jsonb_typeof(item.desktop_options->'track_expiry')<>'boolean'
    or jsonb_typeof(item.desktop_options->'track_batches')<>'boolean'
    or jsonb_typeof(item.desktop_options->'tax_inclusive')<>'boolean'
  then
    raise exception 'Product inventory settings are invalid' using errcode='22023';
  end if;
  if jsonb_typeof(item.desktop_options->'unit_conversion_factor')<>'number'
    or jsonb_typeof(item.desktop_options->'min_stock_level')<>'number'
    or jsonb_typeof(item.desktop_options->'max_stock_level')<>'number'
    or (item.desktop_options->>'unit_conversion_factor') !~ '^[0-9]+([.][0-9]+)?$'
    or (item.desktop_options->>'min_stock_level') !~ '^[0-9]+([.][0-9]+)?$'
    or (item.desktop_options->>'max_stock_level') !~ '^[0-9]+([.][0-9]+)?$'
  then
    raise exception 'Use valid nonnegative numbers for inventory settings'
      using errcode='22023';
  end if;
  if (item.desktop_options->>'unit_conversion_factor')::numeric<=0
    or (item.desktop_options->>'unit_conversion_factor')::numeric>1000000000
    or (item.desktop_options->>'min_stock_level')::numeric>1000000000
    or (item.desktop_options->>'max_stock_level')::numeric>1000000000
    or (item.desktop_options->>'max_stock_level')::numeric <
       (item.desktop_options->>'min_stock_level')::numeric
    or (item.desktop_options->>'min_stock_level')::numeric * 1000 <>
       trunc((item.desktop_options->>'min_stock_level')::numeric * 1000)
    or (item.desktop_options->>'max_stock_level')::numeric * 1000 <>
       trunc((item.desktop_options->>'max_stock_level')::numeric * 1000)
  then
    raise exception 'Product inventory levels are outside the supported range'
      using errcode='22023';
  end if;
  if jsonb_typeof(item.desktop_options->'package_content_quantity')='null'
     and jsonb_typeof(item.desktop_options->'package_content_unit')='null' then
    null;
  elsif jsonb_typeof(item.desktop_options->'package_content_quantity')='number'
    and jsonb_typeof(item.desktop_options->'package_content_unit')='string'
    and (item.desktop_options->>'package_content_quantity') ~ '^[0-9]+([.][0-9]+)?$'
    and (item.desktop_options->>'package_content_unit') in
      ('mg','g','kg','tonne','ml','cl','dl','ltr','mm','cm','m')
  then
    if (item.desktop_options->>'package_content_quantity')::numeric<=0
      or (item.desktop_options->>'package_content_quantity')::numeric>1000000000
    then
      raise exception 'Product package quantity is invalid' using errcode='22023';
    end if;
  else
    raise exception 'Product package quantity and measure must be entered together'
      using errcode='22023';
  end if;
  select * into category from public.desktop_categories c
    where c.id=item.category_id and c.business_id=target_business_id and c.is_active;
  if not found then
    raise exception 'Product category is unavailable' using errcode='23503';
  end if;
  select d.device_public_id into device_id from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=category.local_business_public_id
      and d.paired_by=actor and d.revoked_at is null
    order by d.paired_at,d.id limit 1;
  if device_id is null then
    raise exception 'No paired desktop for the selected category' using errcode='42501';
  end if;
  snapshot := jsonb_build_object(
    'name',item.name,'sku',item.sku,'barcode',item.barcode,'brand',item.brand,
    'description',item.description,'stock_unit',item.stock_unit,
    'cost_price_ugx',item.cost_price_ugx,'selling_price_ugx',item.selling_price_ugx,
    'category_id',category.local_category_id,'desktop_options',item.desktop_options
  );
  insert into private.desktop_product_create_commands(
    business_id,request_id,draft_id,requested_by,
    source_business_public_id,source_device_public_id,local_category_id,category_id,payload
  ) values(
    target_business_id,request_id,target_draft_id,actor,
    category.local_business_public_id,device_id,category.local_category_id,category.id,snapshot
  ) returning id into command_id;
  return command_id;
end $$;

-- Only the originating owner can read status. 'pending' is never 'published'.
create function public.desktop_product_create_status(
  target_business_id uuid,target_command_id uuid
) returns table(command_id uuid,draft_id uuid,state text,requested_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Owner access required' using errcode='42501';
  end if;
  return query select c.id,c.draft_id,c.state,c.created_at
    from private.desktop_product_create_commands c
    where c.business_id=target_business_id and c.id=target_command_id
      and c.requested_by=(select auth.uid());
end $$;

-- Device polling only exposes immutable requests belonging to its paired source.
-- This initial phase has no apply or ACK function: desktop can only STAGE.
create function public.list_pending_desktop_product_creates(
 target_business_id uuid,source_business_public_id text,
 source_device_public_id uuid,batch_limit integer default 20
) returns table(command_id uuid,payload jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if batch_limit is null or batch_limit<1 or batch_limit>20 then
    raise exception 'Invalid batch limit' using errcode='22023';
  end if;
  if not exists(select 1 from private.desktop_product_create_controls x
      where x.business_id=target_business_id and x.requests_enabled) then
    return;
  end if;
  return query select c.id,c.payload,c.created_at
    from private.desktop_product_create_commands c
    where c.business_id=target_business_id
      and c.source_business_public_id=list_pending_desktop_product_creates.source_business_public_id
      and c.source_device_public_id=list_pending_desktop_product_creates.source_device_public_id
      and c.state='pending'
    order by c.created_at,c.id limit batch_limit;
end $$;
revoke all on function public.request_desktop_product_create(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.desktop_product_create_status(uuid,uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.list_pending_desktop_product_creates(uuid,text,uuid,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.request_desktop_product_create(uuid,uuid,uuid)
  to authenticated;
grant execute on function public.desktop_product_create_status(uuid,uuid)
  to authenticated;
grant execute on function public.list_pending_desktop_product_creates(uuid,text,uuid,integer)
  to authenticated;
