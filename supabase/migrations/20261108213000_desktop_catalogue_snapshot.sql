-- Initial desktop -> web catalogue snapshot. Idempotent per source row and
-- fully atomic across categories and products. No inventory ledger mutation.
create table public.desktop_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_business_public_id text not null,
  local_category_id bigint not null check(local_category_id > 0),
  name text not null check(char_length(btrim(name)) between 1 and 160),
  slug text not null check(char_length(btrim(slug)) between 1 and 160),
  description text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(business_id, local_business_public_id, local_category_id),
  unique(business_id, id)
);
create index desktop_categories_business_idx on public.desktop_categories(business_id);

create table public.desktop_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_business_public_id text not null,
  local_product_id bigint not null check(local_product_id > 0),
  category_id uuid not null,
  name text not null check(char_length(btrim(name)) between 1 and 200),
  sku text not null check(char_length(btrim(sku)) between 1 and 160),
  barcode text,
  description text,
  brand text,
  stock_unit text not null,
  selling_price_ugx bigint,
  cost_price_ugx bigint,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(business_id, local_business_public_id, local_product_id),
  foreign key (business_id, category_id) references public.desktop_categories(business_id,id)
);
create index desktop_products_business_category_idx on public.desktop_products(business_id, category_id);
alter table public.desktop_categories enable row level security;
alter table public.desktop_products enable row level security;
revoke all on public.desktop_categories, public.desktop_products from public, anon, authenticated;
grant select on public.desktop_categories,public.desktop_products to authenticated;
create policy desktop_categories_member_read on public.desktop_categories for select to authenticated
  using(business_id in (select private.active_business_ids()));
create policy desktop_products_member_read on public.desktop_products for select to authenticated
  using(business_id in (select private.active_business_ids()));

-- A single RPC handles both stages in one transaction, including failures.
-- Only the registered desktop origin and a non-revoked device owned by the
-- authenticated active business owner can update this origin's rows.
create function public.upload_desktop_catalogue(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  categories jsonb,
  products jsonb
) returns table(categories_uploaded integer, products_uploaded integer)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  cat jsonb;
  prod jsonb;
  cat_id bigint;
  prod_id bigint;
  cat_uuid uuid;
  cat_count integer := 0;
  prod_count integer := 0;
  price_amount bigint;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Cloud business owner access required' using errcode='42501';
  end if;
  if not exists (
    select 1 from private.desktop_devices d
    where d.business_id = target_business_id
      and d.local_business_public_id = source_business_public_id
      and d.device_public_id = source_device_public_id
      and d.paired_by = actor and d.revoked_at is null
  ) then
    raise exception 'Unrecognized or revoked desktop device' using errcode='42501';
  end if;
  if jsonb_typeof(categories) <> 'array' or jsonb_typeof(products) <> 'array'
    or jsonb_array_length(categories) > 2000 or jsonb_array_length(products) > 5000 then
    raise exception 'Invalid catalogue batch' using errcode='22023';
  end if;
  -- Reject duplicate source IDs within the submitted snapshot.
  if exists (select 1 from (
      select elem->>'id' val from jsonb_array_elements(categories) elem
      group by elem->>'id' having count(*) > 1
  ) dup) or exists (select 1 from (
      select elem->>'id' val from jsonb_array_elements(products) elem
      group by elem->>'id' having count(*) > 1
  ) dup) then
    raise exception 'Duplicate source record in snapshot' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-catalogue:' || target_business_id::text || ':' || source_business_public_id,0
  ));

  for cat in select value from jsonb_array_elements(categories) loop
    if jsonb_typeof(cat) <> 'object'
      or (cat->>'id') !~ '^[1-9][0-9]*$'
      or char_length(btrim(coalesce(cat->>'name',''))) not between 1 and 160
      or char_length(btrim(coalesce(cat->>'slug',''))) not between 1 and 160
      or jsonb_typeof(cat->'active') <> 'boolean' then
      raise exception 'Invalid source category' using errcode='22023';
    end if;
    cat_id := (cat->>'id')::bigint;
    insert into public.desktop_categories(
      business_id,local_business_public_id,local_category_id,name,slug,description,is_active
    ) values(target_business_id,source_business_public_id,cat_id,
      btrim(cat->>'name'),btrim(cat->>'slug'),nullif(cat->>'description',''),
      (cat->>'active')::boolean)
    on conflict(business_id,local_business_public_id,local_category_id)
    do update set name=excluded.name,slug=excluded.slug,description=excluded.description,
      is_active=excluded.is_active,updated_at=now();
    cat_count := cat_count + 1;
  end loop;

  for prod in select value from jsonb_array_elements(products) loop
    if jsonb_typeof(prod) <> 'object'
      or (prod->>'id') !~ '^[1-9][0-9]*$'
      or (prod->>'category_id') !~ '^[1-9][0-9]*$'
      or char_length(btrim(coalesce(prod->>'name',''))) not between 1 and 200
      or char_length(btrim(coalesce(prod->>'sku',''))) not between 1 and 160
      or char_length(btrim(coalesce(prod->>'stock_unit',''))) not between 1 and 40
      or jsonb_typeof(prod->'active') <> 'boolean' then
      raise exception 'Invalid source product' using errcode='22023';
    end if;
    prod_id := (prod->>'id')::bigint;
    select dc.id into cat_uuid from public.desktop_categories dc
      where dc.business_id=target_business_id
        and dc.local_business_public_id=source_business_public_id
        and dc.local_category_id=(prod->>'category_id')::bigint;
    if cat_uuid is null then
      raise exception 'Product references a missing category' using errcode='23503';
    end if;
    -- Reject non-integer numeric fields, never silently round financial data.
    if prod->'selling_price_ugx' is not null
      and jsonb_typeof(prod->'selling_price_ugx') <> 'null'
      and (prod->>'selling_price_ugx') !~ '^[0-9]+$' then
      raise exception 'Invalid exact selling price' using errcode='22023';
    end if;
    if prod->'cost_price_ugx' is not null
      and jsonb_typeof(prod->'cost_price_ugx') <> 'null'
      and (prod->>'cost_price_ugx') !~ '^[0-9]+$' then
      raise exception 'Invalid exact cost price' using errcode='22023';
    end if;
    insert into public.desktop_products(
      business_id,local_business_public_id,local_product_id,category_id,name,sku,
      barcode,description,brand,stock_unit,selling_price_ugx,cost_price_ugx,is_active
    ) values(
      target_business_id,source_business_public_id,prod_id,cat_uuid,btrim(prod->>'name'),
      btrim(prod->>'sku'),nullif(prod->>'barcode',''),nullif(prod->>'description',''),
      nullif(prod->>'brand',''),btrim(prod->>'stock_unit'),
      (prod->>'selling_price_ugx')::bigint,(prod->>'cost_price_ugx')::bigint,
      (prod->>'active')::boolean
    )
    on conflict(business_id,local_business_public_id,local_product_id)
    do update set category_id=excluded.category_id,name=excluded.name,sku=excluded.sku,
      barcode=excluded.barcode,description=excluded.description,brand=excluded.brand,
      stock_unit=excluded.stock_unit,selling_price_ugx=excluded.selling_price_ugx,
      cost_price_ugx=excluded.cost_price_ugx,is_active=excluded.is_active,updated_at=now();
    prod_count := prod_count + 1;
  end loop;
  insert into public.audit_events(
    business_id,actor_id,event_type,entity_type,entity_id,payload
  ) values(target_business_id,actor,'desktop.catalogue_uploaded','business',target_business_id,
    jsonb_build_object('categories',cat_count,'products',prod_count,'source','desktop'));
  return query select cat_count,prod_count;
end;
$$;
revoke all on function public.upload_desktop_catalogue(uuid,text,uuid,jsonb,jsonb) from public,anon,service_role;
grant execute on function public.upload_desktop_catalogue(uuid,text,uuid,jsonb,jsonb) to authenticated;
