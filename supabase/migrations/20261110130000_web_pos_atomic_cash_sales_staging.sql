-- Web-originated cash-sale foundation. Additive and DISABLED by default.
-- Applying this migration does not authorize or activate hosted sale posting.
-- The gate remains off until desktop consumption, fiscal rules and concurrency
-- qualification pass. Never change it as part of an ordinary deployment.
--
-- Private tables have no client role grants or row policies. The only callable
-- surface is a narrowly authenticated RPC with fixed search_path.

create table private.web_pos_posting_controls (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  cash_posting_enabled boolean not null default false,
  enabled_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  constraint posting_control_activation_audited check (
    not cash_posting_enabled or (enabled_by is not null and enabled_at is not null)
  )
);

create table private.web_pos_tax_settings (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  vat_registered boolean not null,
  vat_rate_bps integer not null check (vat_rate_bps between 0 and 10000),
  verified_at timestamptz not null,
  verified_by uuid not null references auth.users(id) on delete restrict
);

create table private.web_pos_product_tax_rules (
  business_id uuid not null,
  product_id uuid not null,
  taxable boolean not null,
  tax_inclusive boolean not null,
  verified_at timestamptz not null,
  primary key (business_id,product_id),
  foreign key (business_id,product_id)
    references public.desktop_products(business_id,id) on delete restrict
);

create table private.web_pos_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null,
  request_digest text not null check (request_digest ~ '^[0-9a-f]{32}$'),
  receipt_number text not null,
  currency_code text not null default 'UGX' check (currency_code='UGX'),
  status text not null default 'pending_desktop'
    check (status in ('pending_desktop','desktop_applied','reconciled','voided')),
  subtotal_ugx bigint not null check (subtotal_ugx>=0),
  tax_ugx bigint not null check (tax_ugx>=0),
  total_ugx bigint not null check (total_ugx>=0),
  cash_tendered_ugx bigint not null check (cash_tendered_ugx>=total_ugx),
  change_ugx bigint not null check (change_ugx=cash_tendered_ugx-total_ugx),
  created_at timestamptz not null default now(),
  unique (business_id,id), unique (business_id,idempotency_key),
  unique (business_id,receipt_number),
  check (total_ugx>=subtotal_ugx)
);

create table private.web_pos_sale_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  line_number integer not null check (line_number between 1 and 100),
  quantity_milli bigint not null check (quantity_milli>0),
  unit_price_ugx bigint not null check (unit_price_ugx>=0),
  subtotal_ugx bigint not null check (subtotal_ugx>=0),
  tax_ugx bigint not null check (tax_ugx>=0),
  total_ugx bigint not null check (total_ugx>=subtotal_ugx),
  unique (business_id,sale_id,product_id),
  unique (business_id,sale_id,line_number),
  foreign key (business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict,
  foreign key (business_id,product_id)
    references public.desktop_products(business_id,id) on delete restrict
);

create table private.web_pos_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  method text not null check (method in ('cash')),
  status text not null check (status in ('confirmed','reversed')),
  amount_ugx bigint not null check (amount_ugx>=0),
  created_at timestamptz not null default now(),
  unique (business_id,sale_id,method),
  foreign key (business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict
);

-- Holds remain until both desktop application AND the corresponding
-- desktop-to-hosted stock movement are confirmed; otherwise POS stock could
-- briefly appear twice when the desktop has acknowledged but its cloud
-- movement is not yet visible.
create table private.web_pos_stock_holds (
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  quantity_milli bigint not null check (quantity_milli>0),
  state text not null default 'pending'
    check (state in ('pending','reflected_in_desktop','released')),
  reflected_movement_id bigint,
  reflected_at timestamptz,
  primary key (business_id,sale_id,product_id),
  foreign key (business_id,sale_id,product_id)
    references private.web_pos_sale_lines(business_id,sale_id,product_id)
    on delete restrict,
  check (state <> 'released' or (reflected_movement_id is not null and reflected_at is not null))
);
create index web_pos_open_stock_holds_idx
  on private.web_pos_stock_holds (business_id,product_id)
  include (quantity_milli) where state <> 'released';

-- Durable one-time desktop consumption. A desktop must acknowledge only
-- after applying the inventory and financial effects idempotently.
create table private.web_pos_reconciliation_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  event_type text not null default 'web.cash_sale.created'
    check (event_type='web.cash_sale.created'),
  status text not null default 'pending'
    check (status in ('pending','delivering','desktop_applied','reconciled')),
  event_payload jsonb not null check (jsonb_typeof(event_payload)='object'),
  attempt_count integer not null default 0 check (attempt_count>=0),
  next_attempt_at timestamptz,
  applied_by_device uuid,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id,sale_id,event_type),
  foreign key (business_id,sale_id)
    references private.web_pos_sales(business_id,id) on delete restrict
);
create index web_pos_outbox_pending_idx on private.web_pos_reconciliation_outbox
  (business_id,status,created_at);

-- Deny all Data API roles direct table access. Forced RLS additionally
-- blocks accidental access under future role grants.
alter table private.web_pos_posting_controls enable row level security;
alter table private.web_pos_posting_controls force row level security;
alter table private.web_pos_tax_settings enable row level security;
alter table private.web_pos_tax_settings force row level security;
alter table private.web_pos_product_tax_rules enable row level security;
alter table private.web_pos_product_tax_rules force row level security;
alter table private.web_pos_sales enable row level security;
alter table private.web_pos_sales force row level security;
alter table private.web_pos_sale_lines enable row level security;
alter table private.web_pos_sale_lines force row level security;
alter table private.web_pos_payments enable row level security;
alter table private.web_pos_payments force row level security;
alter table private.web_pos_stock_holds enable row level security;
alter table private.web_pos_stock_holds force row level security;
alter table private.web_pos_reconciliation_outbox enable row level security;
alter table private.web_pos_reconciliation_outbox force row level security;

revoke all on private.web_pos_posting_controls, private.web_pos_tax_settings,
  private.web_pos_product_tax_rules, private.web_pos_sales,
  private.web_pos_sale_lines, private.web_pos_payments,
  private.web_pos_stock_holds, private.web_pos_reconciliation_outbox
from public,anon,authenticated,service_role;

-- Authorized cash posting is one Postgres transaction (an RPC call).
-- IMPORTANT: no mechanism to activate the gate is exposed to app clients.
create function public.post_web_pos_cash_sale(
  target_business_id uuid,
  request_id uuid,
  sale_items jsonb,
  cash_received_ugx bigint
)
returns table (
  sale_id uuid, receipt_number text, total_ugx bigint,
  change_ugx bigint, replayed boolean
)
language plpgsql security definer set search_path=''
as $$
declare
  actor uuid := (select auth.uid());
  permission public.business_role;
  stored private.web_pos_sales%rowtype;
  request_fingerprint text;
  tax_policy private.web_pos_tax_settings%rowtype;
  item jsonb;
  item_id uuid;
  quantity_requested bigint;
  product public.desktop_products%rowtype;
  tax_rule private.web_pos_product_tax_rules%rowtype;
  stock record;
  held_quantity numeric;
  available_quantity numeric;
  price_subtotal numeric;
  line_tax numeric;
  line_total numeric;
  sum_subtotal numeric := 0;
  sum_tax numeric := 0;
  sum_total numeric := 0;
  item_index integer := 0;
  new_sale_id uuid;
  new_receipt text;
  source_record record;
  work_lines jsonb := '[]'::jsonb;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select m.role into permission from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active;
  if permission is null or permission not in ('owner','manager','cashier') then
    raise exception 'Business sales permission required' using errcode='42501';
  end if;
  if request_id is null or
     request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
     cash_received_ugx is null or cash_received_ugx < 0 or
     sale_items is null or jsonb_typeof(sale_items)<>'array' or
     jsonb_array_length(sale_items) not between 1 and 100 then
    raise exception 'Invalid sale submission' using errcode='22023';
  end if;

  -- Serialize all hosted cash attempts per tenant. This makes the
  -- idempotency lookup linearizable even for concurrent same-key retries.
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-web-pos:' || target_business_id::text, 0
  ));
  request_fingerprint := md5(sale_items::text || ':' || cash_received_ugx::text);
  select * into stored from private.web_pos_sales s
    where s.business_id=target_business_id and s.idempotency_key=request_id;
  if found then
    if stored.request_digest <> request_fingerprint then
      raise exception 'Idempotency key reused for different content'
        using errcode='23505';
    end if;
    return query select stored.id, stored.receipt_number, stored.total_ugx,
      stored.change_ugx, true;
    return;
  end if;

  -- Disabled until comprehensive integration + desktop consumer qualification.
  if not exists (select 1 from private.web_pos_posting_controls g
    where g.business_id=target_business_id and g.cash_posting_enabled) then
    raise exception 'Hosted cash sales are not yet enabled'
      using errcode='55000';
  end if;

  select * into tax_policy from private.web_pos_tax_settings t
    where t.business_id=target_business_id;
  if not found then
    raise exception 'Tax settings need verification before checkout'
      using errcode='55000';
  end if;

  if exists (
    select 1 from (
      select row_data->>'product_id' as product_id, count(*) as copies
      from jsonb_array_elements(sale_items) row_data
      group by row_data->>'product_id'
      having count(*)>1
    ) duplicates
  ) then
    raise exception 'Duplicate sale product' using errcode='22023';
  end if;

  -- Validate every item before casting UUIDs in the lock discovery query.
  -- This prevents malformed payloads from entering privileged stock reads.
  for item in select value from jsonb_array_elements(sale_items) loop
    if jsonb_typeof(item) <> 'object'
       or (select count(*) from jsonb_object_keys(item) k) <> 2
       or not (item ? 'product_id' and item ? 'quantity_milli')
       or (item->>'product_id') !~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
  -- by checkpoint and movement ingestion. Sorted order avoids lock inversion.
  for source_record in
    select distinct p.local_business_public_id as source_id
    from public.desktop_products p
    where p.business_id=target_business_id
      and p.id in (
        select (v->>'product_id')::uuid
        from jsonb_array_elements(sale_items) v
      )
    order by p.local_business_public_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'akilibiz-stock:' || target_business_id::text || ':' || source_record.source_id,0
    ));
  end loop;

  new_sale_id := gen_random_uuid();
  new_receipt := 'WEB-' || replace(new_sale_id::text,'-','');
  -- Build the complete validated receipt in local PL/pgSQL memory.
  -- No temporary table or caller-controlled relations in SECURITY DEFINER code.

  for item in select value from jsonb_array_elements(sale_items) loop
    item_index := item_index + 1;
    if jsonb_typeof(item) <> 'object'
       or (select count(*) from jsonb_object_keys(item) k) <> 2
       or not (item ? 'product_id' and item ? 'quantity_milli')
       or (item->>'product_id') !~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(item->'quantity_milli') <> 'number'
       or (item->>'quantity_milli') !~ '^[1-9][0-9]*$'
       or length(item->>'quantity_milli') > 15 then
      raise exception 'Invalid sale item' using errcode='22023';
    end if;
    item_id := (item->>'product_id')::uuid;
    quantity_requested := (item->>'quantity_milli')::bigint;
    if quantity_requested>1000000000 then
      raise exception 'Sale quantity exceeds limit' using errcode='22023';
    end if;
    select * into product from public.desktop_products p
      where p.id=item_id and p.business_id=target_business_id and p.is_active;
    if not found or product.selling_price_ugx is null or product.selling_price_ugx<0 then
      raise exception 'Product is not available for sale' using errcode='23514';
    end if;
    select * into tax_rule from private.web_pos_product_tax_rules t
      where t.business_id=target_business_id and t.product_id=item_id;
    if not found then
      raise exception 'Product tax classification is missing' using errcode='55000';
    end if;
    select * into stock from public.list_desktop_effective_inventory(target_business_id) p
      where p.product_id=item_id and p.is_current;
    if not found or stock.on_hand_milli is null or stock.reserved_milli is null
       or stock.damaged_milli is null then
      raise exception 'Verified inventory is unavailable' using errcode='23514';
    end if;
    select coalesce(sum(h.quantity_milli),0) into held_quantity
      from private.web_pos_stock_holds h
      where h.business_id=target_business_id
        and h.product_id=item_id and h.state<>'released';
    available_quantity := stock.on_hand_milli::numeric -
      stock.reserved_milli::numeric - stock.damaged_milli::numeric - held_quantity;
    if available_quantity < quantity_requested then
      raise exception 'Insufficient sellable stock' using errcode='23514';
    end if;
    price_subtotal := floor(
      product.selling_price_ugx::numeric * quantity_requested::numeric / 1000 + 0.5
    );
    line_tax := 0;
    if tax_policy.vat_registered and tax_rule.taxable then
      if tax_rule.tax_inclusive then
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric /
          (10000 + tax_policy.vat_rate_bps)::numeric + 0.5);
      else
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric / 10000 + 0.5);
      end if;
    end if;
    line_total := case when tax_rule.tax_inclusive then
      price_subtotal else price_subtotal + line_tax end;
    sum_subtotal := sum_subtotal + case when tax_rule.tax_inclusive then
      price_subtotal-line_tax else price_subtotal end;
    sum_tax := sum_tax+line_tax;
    sum_total := sum_total+line_total;
    if sum_total>9223372036854775807::numeric or
       sum_subtotal>9223372036854775807::numeric then
      raise exception 'Sale amount exceeds limit' using errcode='22003';
    end if;
    work_lines := work_lines || jsonb_build_array(jsonb_build_object(
      'line_number',item_index,
      'product_id',item_id,
      'quantity_milli',quantity_requested,
      'unit_price_ugx',product.selling_price_ugx,
      'subtotal_ugx',(case when tax_rule.tax_inclusive then price_subtotal-line_tax else price_subtotal end)::bigint,
      'tax_ugx',line_tax::bigint,
      'total_ugx',line_total::bigint
    ));
  end loop;
  if cash_received_ugx::numeric < sum_total then
    raise exception 'Cash received is less than total' using errcode='23514';
  end if;

  insert into private.web_pos_sales (
    id,business_id,actor_id,idempotency_key,request_digest,
    receipt_number,subtotal_ugx,tax_ugx,total_ugx,cash_tendered_ugx,change_ugx
  ) values (
    new_sale_id,target_business_id,actor,request_id,request_fingerprint,
    new_receipt,sum_subtotal::bigint,sum_tax::bigint,sum_total::bigint,
    cash_received_ugx,(cash_received_ugx::numeric-sum_total)::bigint
  );
  insert into private.web_pos_sale_lines (
    business_id,sale_id,product_id,line_number,quantity_milli,
    unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
  ) select target_business_id,new_sale_id,product_id,line_number,
    quantity_milli,unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_stock_holds (
    business_id,sale_id,product_id,quantity_milli
  ) select target_business_id,new_sale_id,product_id,quantity_milli
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_payments (
    business_id,sale_id,method,status,amount_ugx
  ) values (target_business_id,new_sale_id,'cash','confirmed',sum_total::bigint);

  insert into private.web_pos_reconciliation_outbox (
    business_id,sale_id,event_payload
  ) values (
    target_business_id,new_sale_id,
    jsonb_build_object(
      'sale_id',new_sale_id,'receipt_number',new_receipt,
      'currency','UGX','subtotal_ugx',sum_subtotal,
      'tax_ugx',sum_tax,'total_ugx',sum_total,
      'payment_method','cash',
      'lines',work_lines
    )
  );
  insert into public.audit_events (
    business_id,actor_id,event_type,entity_type,entity_id,payload
  ) values (
    target_business_id,actor,'web.cash_sale.posted','web_sale',new_sale_id,
    jsonb_build_object('receipt_number',new_receipt,'total_ugx',sum_total)
  );
  return query select new_sale_id,new_receipt,sum_total::bigint,
    (cash_received_ugx::numeric-sum_total)::bigint,false;
end;
$$;

revoke all on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  from public,anon,authenticated,service_role;
grant execute on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  to authenticated;

       or jsonb_typeof(item->'quantity_milli') <> 'number'
       or (item->>'quantity_milli') !~ '^[1-9][0-9]*
  -- by checkpoint and movement ingestion. Sorted order avoids lock inversion.
  for source_record in
    select distinct p.local_business_public_id as source_id
    from public.desktop_products p
    where p.business_id=target_business_id
      and p.id in (
        select (v->>'product_id')::uuid
        from jsonb_array_elements(sale_items) v
        where (v->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f-]{27,36}$'
      )
    order by p.local_business_public_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'akilibiz-stock:' || target_business_id::text || ':' || source_record.source_id,0
    ));
  end loop;

  new_sale_id := gen_random_uuid();
  new_receipt := 'WEB-' || replace(new_sale_id::text,'-','');
  -- Build the complete validated receipt in local PL/pgSQL memory.
  -- No temporary table or caller-controlled relations in SECURITY DEFINER code.

  for item in select value from jsonb_array_elements(sale_items) loop
    item_index := item_index + 1;
    if jsonb_typeof(item) <> 'object'
       or (select count(*) from jsonb_object_keys(item) k) <> 2
       or not (item ? 'product_id' and item ? 'quantity_milli')
       or (item->>'product_id') !~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(item->'quantity_milli') <> 'number'
       or (item->>'quantity_milli') !~ '^[1-9][0-9]*$'
       or length(item->>'quantity_milli') > 15 then
      raise exception 'Invalid sale item' using errcode='22023';
    end if;
    item_id := (item->>'product_id')::uuid;
    quantity_requested := (item->>'quantity_milli')::bigint;
    if quantity_requested>1000000000 then
      raise exception 'Sale quantity exceeds limit' using errcode='22023';
    end if;
    select * into product from public.desktop_products p
      where p.id=item_id and p.business_id=target_business_id and p.is_active;
    if not found or product.selling_price_ugx is null or product.selling_price_ugx<0 then
      raise exception 'Product is not available for sale' using errcode='23514';
    end if;
    select * into tax_rule from private.web_pos_product_tax_rules t
      where t.business_id=target_business_id and t.product_id=item_id;
    if not found then
      raise exception 'Product tax classification is missing' using errcode='55000';
    end if;
    select * into stock from public.list_desktop_effective_inventory(target_business_id) p
      where p.product_id=item_id and p.is_current;
    if not found or stock.on_hand_milli is null or stock.reserved_milli is null
       or stock.damaged_milli is null then
      raise exception 'Verified inventory is unavailable' using errcode='23514';
    end if;
    select coalesce(sum(h.quantity_milli),0) into held_quantity
      from private.web_pos_stock_holds h
      where h.business_id=target_business_id
        and h.product_id=item_id and h.state<>'released';
    available_quantity := stock.on_hand_milli::numeric -
      stock.reserved_milli::numeric - stock.damaged_milli::numeric - held_quantity;
    if available_quantity < quantity_requested then
      raise exception 'Insufficient sellable stock' using errcode='23514';
    end if;
    price_subtotal := floor(
      product.selling_price_ugx::numeric * quantity_requested::numeric / 1000 + 0.5
    );
    line_tax := 0;
    if tax_policy.vat_registered and tax_rule.taxable then
      if tax_rule.tax_inclusive then
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric /
          (10000 + tax_policy.vat_rate_bps)::numeric + 0.5);
      else
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric / 10000 + 0.5);
      end if;
    end if;
    line_total := case when tax_rule.tax_inclusive then
      price_subtotal else price_subtotal + line_tax end;
    sum_subtotal := sum_subtotal + case when tax_rule.tax_inclusive then
      price_subtotal-line_tax else price_subtotal end;
    sum_tax := sum_tax+line_tax;
    sum_total := sum_total+line_total;
    if sum_total>9223372036854775807::numeric or
       sum_subtotal>9223372036854775807::numeric then
      raise exception 'Sale amount exceeds limit' using errcode='22003';
    end if;
    work_lines := work_lines || jsonb_build_array(jsonb_build_object(
      'line_number',item_index,
      'product_id',item_id,
      'quantity_milli',quantity_requested,
      'unit_price_ugx',product.selling_price_ugx,
      'subtotal_ugx',(case when tax_rule.tax_inclusive then price_subtotal-line_tax else price_subtotal end)::bigint,
      'tax_ugx',line_tax::bigint,
      'total_ugx',line_total::bigint
    ));
  end loop;
  if cash_received_ugx::numeric < sum_total then
    raise exception 'Cash received is less than total' using errcode='23514';
  end if;

  insert into private.web_pos_sales (
    id,business_id,actor_id,idempotency_key,request_digest,
    receipt_number,subtotal_ugx,tax_ugx,total_ugx,cash_tendered_ugx,change_ugx
  ) values (
    new_sale_id,target_business_id,actor,request_id,request_fingerprint,
    new_receipt,sum_subtotal::bigint,sum_tax::bigint,sum_total::bigint,
    cash_received_ugx,(cash_received_ugx::numeric-sum_total)::bigint
  );
  insert into private.web_pos_sale_lines (
    business_id,sale_id,product_id,line_number,quantity_milli,
    unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
  ) select target_business_id,new_sale_id,product_id,line_number,
    quantity_milli,unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_stock_holds (
    business_id,sale_id,product_id,quantity_milli
  ) select target_business_id,new_sale_id,product_id,quantity_milli
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_payments (
    business_id,sale_id,method,status,amount_ugx
  ) values (target_business_id,new_sale_id,'cash','confirmed',sum_total::bigint);

  insert into private.web_pos_reconciliation_outbox (
    business_id,sale_id,event_payload
  ) values (
    target_business_id,new_sale_id,
    jsonb_build_object(
      'sale_id',new_sale_id,'receipt_number',new_receipt,
      'currency','UGX','subtotal_ugx',sum_subtotal,
      'tax_ugx',sum_tax,'total_ugx',sum_total,
      'payment_method','cash',
      'lines',work_lines
    )
  );
  insert into public.audit_events (
    business_id,actor_id,event_type,entity_type,entity_id,payload
  ) values (
    target_business_id,actor,'web.cash_sale.posted','web_sale',new_sale_id,
    jsonb_build_object('receipt_number',new_receipt,'total_ugx',sum_total)
  );
  return query select new_sale_id,new_receipt,sum_total::bigint,
    (cash_received_ugx::numeric-sum_total)::bigint,false;
end;
$$;

revoke all on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  from public,anon,authenticated,service_role;
grant execute on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  to authenticated;

       or length(item->>'quantity_milli') > 15 then
      raise exception 'Invalid sale item' using errcode='22023';
    end if;
    if (item->>'quantity_milli')::bigint > 1000000000 then
      raise exception 'Sale quantity exceeds limit' using errcode='22023';
    end if;
  end loop;

  -- Lock each desktop source using exactly the advisory-lock namespace shared
  -- by checkpoint and movement ingestion. Sorted order avoids lock inversion.
  for source_record in
    select distinct p.local_business_public_id as source_id
    from public.desktop_products p
    where p.business_id=target_business_id
      and p.id in (
        select (v->>'product_id')::uuid
        from jsonb_array_elements(sale_items) v
        where (v->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f-]{27,36}$'
      )
    order by p.local_business_public_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'akilibiz-stock:' || target_business_id::text || ':' || source_record.source_id,0
    ));
  end loop;

  new_sale_id := gen_random_uuid();
  new_receipt := 'WEB-' || replace(new_sale_id::text,'-','');
  -- Build the complete validated receipt in local PL/pgSQL memory.
  -- No temporary table or caller-controlled relations in SECURITY DEFINER code.

  for item in select value from jsonb_array_elements(sale_items) loop
    item_index := item_index + 1;
    if jsonb_typeof(item) <> 'object'
       or (select count(*) from jsonb_object_keys(item) k) <> 2
       or not (item ? 'product_id' and item ? 'quantity_milli')
       or (item->>'product_id') !~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(item->'quantity_milli') <> 'number'
       or (item->>'quantity_milli') !~ '^[1-9][0-9]*$'
       or length(item->>'quantity_milli') > 15 then
      raise exception 'Invalid sale item' using errcode='22023';
    end if;
    item_id := (item->>'product_id')::uuid;
    quantity_requested := (item->>'quantity_milli')::bigint;
    if quantity_requested>1000000000 then
      raise exception 'Sale quantity exceeds limit' using errcode='22023';
    end if;
    select * into product from public.desktop_products p
      where p.id=item_id and p.business_id=target_business_id and p.is_active;
    if not found or product.selling_price_ugx is null or product.selling_price_ugx<0 then
      raise exception 'Product is not available for sale' using errcode='23514';
    end if;
    select * into tax_rule from private.web_pos_product_tax_rules t
      where t.business_id=target_business_id and t.product_id=item_id;
    if not found then
      raise exception 'Product tax classification is missing' using errcode='55000';
    end if;
    select * into stock from public.list_desktop_effective_inventory(target_business_id) p
      where p.product_id=item_id and p.is_current;
    if not found or stock.on_hand_milli is null or stock.reserved_milli is null
       or stock.damaged_milli is null then
      raise exception 'Verified inventory is unavailable' using errcode='23514';
    end if;
    select coalesce(sum(h.quantity_milli),0) into held_quantity
      from private.web_pos_stock_holds h
      where h.business_id=target_business_id
        and h.product_id=item_id and h.state<>'released';
    available_quantity := stock.on_hand_milli::numeric -
      stock.reserved_milli::numeric - stock.damaged_milli::numeric - held_quantity;
    if available_quantity < quantity_requested then
      raise exception 'Insufficient sellable stock' using errcode='23514';
    end if;
    price_subtotal := floor(
      product.selling_price_ugx::numeric * quantity_requested::numeric / 1000 + 0.5
    );
    line_tax := 0;
    if tax_policy.vat_registered and tax_rule.taxable then
      if tax_rule.tax_inclusive then
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric /
          (10000 + tax_policy.vat_rate_bps)::numeric + 0.5);
      else
        line_tax := floor(price_subtotal * tax_policy.vat_rate_bps::numeric / 10000 + 0.5);
      end if;
    end if;
    line_total := case when tax_rule.tax_inclusive then
      price_subtotal else price_subtotal + line_tax end;
    sum_subtotal := sum_subtotal + case when tax_rule.tax_inclusive then
      price_subtotal-line_tax else price_subtotal end;
    sum_tax := sum_tax+line_tax;
    sum_total := sum_total+line_total;
    if sum_total>9223372036854775807::numeric or
       sum_subtotal>9223372036854775807::numeric then
      raise exception 'Sale amount exceeds limit' using errcode='22003';
    end if;
    work_lines := work_lines || jsonb_build_array(jsonb_build_object(
      'line_number',item_index,
      'product_id',item_id,
      'quantity_milli',quantity_requested,
      'unit_price_ugx',product.selling_price_ugx,
      'subtotal_ugx',(case when tax_rule.tax_inclusive then price_subtotal-line_tax else price_subtotal end)::bigint,
      'tax_ugx',line_tax::bigint,
      'total_ugx',line_total::bigint
    ));
  end loop;
  if cash_received_ugx::numeric < sum_total then
    raise exception 'Cash received is less than total' using errcode='23514';
  end if;

  insert into private.web_pos_sales (
    id,business_id,actor_id,idempotency_key,request_digest,
    receipt_number,subtotal_ugx,tax_ugx,total_ugx,cash_tendered_ugx,change_ugx
  ) values (
    new_sale_id,target_business_id,actor,request_id,request_fingerprint,
    new_receipt,sum_subtotal::bigint,sum_tax::bigint,sum_total::bigint,
    cash_received_ugx,(cash_received_ugx::numeric-sum_total)::bigint
  );
  insert into private.web_pos_sale_lines (
    business_id,sale_id,product_id,line_number,quantity_milli,
    unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
  ) select target_business_id,new_sale_id,product_id,line_number,
    quantity_milli,unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_stock_holds (
    business_id,sale_id,product_id,quantity_milli
  ) select target_business_id,new_sale_id,product_id,quantity_milli
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );

  insert into private.web_pos_payments (
    business_id,sale_id,method,status,amount_ugx
  ) values (target_business_id,new_sale_id,'cash','confirmed',sum_total::bigint);

  insert into private.web_pos_reconciliation_outbox (
    business_id,sale_id,event_payload
  ) values (
    target_business_id,new_sale_id,
    jsonb_build_object(
      'sale_id',new_sale_id,'receipt_number',new_receipt,
      'currency','UGX','subtotal_ugx',sum_subtotal,
      'tax_ugx',sum_tax,'total_ugx',sum_total,
      'payment_method','cash',
      'lines',work_lines
    )
  );
  insert into public.audit_events (
    business_id,actor_id,event_type,entity_type,entity_id,payload
  ) values (
    target_business_id,actor,'web.cash_sale.posted','web_sale',new_sale_id,
    jsonb_build_object('receipt_number',new_receipt,'total_ugx',sum_total)
  );
  return query select new_sale_id,new_receipt,sum_total::bigint,
    (cash_received_ugx::numeric-sum_total)::bigint,false;
end;
$$;

revoke all on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  from public,anon,authenticated,service_role;
grant execute on function public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)
  to authenticated;
