-- Web POS tax parity with the desktop.
--
-- 1. Nothing populated private.web_pos_tax_settings or web_pos_product_tax_rules,
--    so no business could post a web sale. The paired desktop now publishes its
--    own POS tax profile (VAT registration, per-product rate and tax-inclusive
--    flag derived from its authoritative classification and effective rules).
-- 2. Hosted VAT was rounded per line, while the desktop rounds once per invoice
--    and allocates by largest remainder. The desktop recomputes every web sale
--    exactly and rejected any mismatch, leaving the sale and its stock hold stuck.
--    Posting and a new read-only quote share one pricing function that uses the
--    desktop's algorithm and rejects lines that do not
--    resolve to whole UGX, as the desktop does.
-- Additive; the per-business posting gate stays off.

alter table private.web_pos_product_tax_rules
  add column rate_basis_points integer
  check (rate_basis_points is null or rate_basis_points between 0 and 10000);

-- Exact port of tax::exact::calculate_invoice_tax. Input: array of
-- {amount_ugx, rate_bps, inclusive}. Output: array of per-line tax (UGX).
create function private.web_pos_allocate_invoice_tax(inputs jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare
  n integer := coalesce(jsonb_array_length(inputs),0);
  common numeric := 1;
  den numeric;
  scaled numeric[] := '{}';
  total_numerator numeric := 0;
  invoice_tax numeric;
  floor_total numeric := 0;
  remainder numeric;
  result numeric[] := '{}';
  rec record;
  k integer;
begin
  if n = 0 then return '[]'::jsonb; end if;
  for k in 0..n-1 loop
    if (inputs->k->>'amount_ugx')::numeric < 0 or (inputs->k->>'rate_bps')::numeric < 0 then
      raise exception 'Tax inputs must be non-negative' using errcode='22023';
    end if;
    den := case when (inputs->k->>'inclusive')::boolean
      then 10000 + (inputs->k->>'rate_bps')::numeric else 10000 end;
    common := lcm(common, den);
  end loop;
  for k in 0..n-1 loop
    den := case when (inputs->k->>'inclusive')::boolean
      then 10000 + (inputs->k->>'rate_bps')::numeric else 10000 end;
    scaled := scaled || ((inputs->k->>'amount_ugx')::numeric
      * (inputs->k->>'rate_bps')::numeric * div(common, den));
    total_numerator := total_numerator + scaled[k+1];
    result := result || div(scaled[k+1], common);
    floor_total := floor_total + div(scaled[k+1], common);
  end loop;
  invoice_tax := div(total_numerator + div(common, 2), common);
  remainder := invoice_tax - floor_total;
  -- Largest fractional remainder first; ties by original line order.
  for rec in
    select idx, mod(scaled[idx], common) as frac
      from generate_series(1, n) idx
     order by mod(scaled[idx], common) desc, idx asc
     limit greatest(remainder, 0)::integer
  loop
    result[rec.idx] := result[rec.idx] + 1;
  end loop;
  return to_jsonb(result);
end $$;
revoke all on function private.web_pos_allocate_invoice_tax(jsonb)
  from public,anon,authenticated,service_role;

-- The paired desktop publishes its POS tax profile. Rules are keyed by the
-- desktop's own product IDs and mapped to this business's synchronized
-- products; unknown products are skipped and products not listed lose their
-- rule (so they cannot be sold on the web until the desktop can price them).
create function public.publish_desktop_pos_tax_profile(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  vat_registered boolean,
  vat_rate_bps integer,
  product_rules jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare
  actor uuid;
  rule jsonb;
  hosted_product uuid;
  applied integer := 0;
begin
  actor := private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if vat_registered is null or vat_rate_bps is null or vat_rate_bps not between 0 and 10000
     or jsonb_typeof(product_rules) <> 'array' or jsonb_array_length(product_rules) > 20000 then
    raise exception 'Invalid POS tax profile' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-web-pos:' || target_business_id::text, 0));
  insert into private.web_pos_tax_settings(business_id,vat_registered,vat_rate_bps,verified_at,verified_by)
  values (target_business_id,vat_registered,vat_rate_bps,now(),actor)
  on conflict (business_id) do update set vat_registered=excluded.vat_registered,
    vat_rate_bps=excluded.vat_rate_bps,verified_at=excluded.verified_at,verified_by=excluded.verified_by;
  delete from private.web_pos_product_tax_rules r
   using public.desktop_products p
   where r.business_id=target_business_id and p.business_id=r.business_id and p.id=r.product_id
     and p.local_business_public_id=publish_desktop_pos_tax_profile.source_business_public_id;
  for rule in select value from jsonb_array_elements(product_rules) loop
    if jsonb_typeof(rule) <> 'object'
       or (rule->>'local_product_id') !~ '^[1-9][0-9]{0,17}$'
       or jsonb_typeof(rule->'rate_bps') <> 'number' or (rule->>'rate_bps') !~ '^[0-9]{1,5}$'
       or (rule->>'rate_bps')::integer > 10000
       or jsonb_typeof(rule->'tax_inclusive') <> 'boolean' then
      raise exception 'Invalid POS tax rule' using errcode='22023';
    end if;
    select p.id into hosted_product from public.desktop_products p
     where p.business_id=target_business_id
       and p.local_business_public_id=publish_desktop_pos_tax_profile.source_business_public_id
       and p.local_product_id=(rule->>'local_product_id')::bigint;
    if hosted_product is not null then
      insert into private.web_pos_product_tax_rules(
        business_id,product_id,taxable,tax_inclusive,verified_at,rate_basis_points)
      values (target_business_id,hosted_product,(rule->>'rate_bps')::integer>0,
        (rule->>'tax_inclusive')::boolean,now(),(rule->>'rate_bps')::integer);
      applied := applied + 1;
    end if;
  end loop;
  return applied;
end $$;
revoke all on function public.publish_desktop_pos_tax_profile(uuid,text,uuid,boolean,integer,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.publish_desktop_pos_tax_profile(uuid,text,uuid,boolean,integer,jsonb)
  to authenticated;

-- Single source of truth for web POS pricing, shared by the read-only quote
-- and by posting so the preview total always equals the posted total.
-- Validates items, prices, published tax rules and sellable stock (net of
-- open web holds), requires whole-UGX lines and allocates invoice-level VAT
-- exactly like the desktop. Returns {lines, subtotal_ugx, tax_ugx, total_ugx}.
create function private.web_pos_price_sale(target_business_id uuid, sale_items jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare
  tax_policy private.web_pos_tax_settings%rowtype;
  item jsonb;
  item_id uuid;
  quantity_requested bigint;
  product public.desktop_products%rowtype;
  tax_rule private.web_pos_product_tax_rules%rowtype;
  stock record;
  held_quantity numeric;
  available_quantity numeric;
  scaled_amount numeric;
  gross_amount numeric;
  line_rate integer;
  tax_inputs jsonb := '[]'::jsonb;
  line_facts jsonb := '[]'::jsonb;
  allocated jsonb;
  fact jsonb;
  line_tax numeric;
  line_total numeric;
  line_subtotal numeric;
  sum_subtotal numeric := 0;
  sum_tax numeric := 0;
  sum_total numeric := 0;
  item_index integer := 0;
  work_lines jsonb := '[]'::jsonb;
  i integer;
begin
  if sale_items is null or jsonb_typeof(sale_items)<>'array' or
     jsonb_array_length(sale_items) not between 1 and 100 then
    raise exception 'Invalid sale submission' using errcode='22023';
  end if;
  select * into tax_policy from private.web_pos_tax_settings t
    where t.business_id=target_business_id;
  if not found then
    raise exception 'Tax settings need verification before checkout'
      using errcode='55000';
  end if;
  if exists (
    select 1 from jsonb_array_elements(sale_items) row_data
    group by row_data->>'product_id' having count(*)>1
  ) then
    raise exception 'Duplicate sale product' using errcode='22023';
  end if;
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
    -- Desktop parity: a line must resolve to whole UGX (desktop
    -- sale_line_gross_ugx), and VAT uses the product's published rate.
    scaled_amount := product.selling_price_ugx::numeric * quantity_requested::numeric;
    if mod(scaled_amount, 1000) <> 0 then
      raise exception 'Line amount must resolve to whole UGX' using errcode='22023';
    end if;
    gross_amount := div(scaled_amount, 1000);
    line_rate := case
      when not tax_policy.vat_registered then 0
      when tax_rule.rate_basis_points is not null then tax_rule.rate_basis_points
      when tax_rule.taxable then tax_policy.vat_rate_bps
      else 0 end;
    tax_inputs := tax_inputs || jsonb_build_array(jsonb_build_object(
      'amount_ugx',gross_amount,'rate_bps',line_rate,'inclusive',tax_rule.tax_inclusive));
    line_facts := line_facts || jsonb_build_array(jsonb_build_object(
      'line_number',item_index,'product_id',item_id,'quantity_milli',quantity_requested,
      'unit_price_ugx',product.selling_price_ugx,'gross_ugx',gross_amount,
      'inclusive',tax_rule.tax_inclusive));
  end loop;
  -- One invoice-level rounding with largest-remainder allocation, identical
  -- to the desktop's tax::exact::calculate_invoice_tax.
  allocated := private.web_pos_allocate_invoice_tax(tax_inputs);
  for i in 0..jsonb_array_length(line_facts)-1 loop
    fact := line_facts->i;
    line_tax := (allocated->>i)::numeric;
    line_total := case when (fact->>'inclusive')::boolean
      then (fact->>'gross_ugx')::numeric else (fact->>'gross_ugx')::numeric + line_tax end;
    line_subtotal := line_total - line_tax;
    sum_subtotal := sum_subtotal + line_subtotal;
    sum_tax := sum_tax + line_tax;
    sum_total := sum_total + line_total;
    if sum_total>9007199254740991::numeric then
      raise exception 'Sale amount exceeds limit' using errcode='22003';
    end if;
    work_lines := work_lines || jsonb_build_array(jsonb_build_object(
      'line_number',(fact->>'line_number')::integer,
      'product_id',(fact->>'product_id')::uuid,
      'quantity_milli',(fact->>'quantity_milli')::bigint,
      'unit_price_ugx',(fact->>'unit_price_ugx')::bigint,
      'subtotal_ugx',line_subtotal::bigint,
      'tax_ugx',line_tax::bigint,
      'total_ugx',line_total::bigint
    ));
  end loop;
  return jsonb_build_object('lines',work_lines,'subtotal_ugx',sum_subtotal::bigint,
    'tax_ugx',sum_tax::bigint,'total_ugx',sum_total::bigint);
end $$;
revoke all on function private.web_pos_price_sale(uuid,jsonb)
  from public,anon,authenticated,service_role;

-- Read-only checkout quote using exactly the posting rules (no locks, no writes).
create function public.quote_web_pos_cash_sale(target_business_id uuid, sale_items jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  permission public.business_role;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select m.role into permission from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active;
  if permission is null or permission not in ('owner','manager','cashier') then
    raise exception 'Business sales permission required' using errcode='42501';
  end if;
  return private.web_pos_price_sale(target_business_id, sale_items);
end $$;
revoke all on function public.quote_web_pos_cash_sale(uuid,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.quote_web_pos_cash_sale(uuid,jsonb) to authenticated;

-- Posting: same authorization, idempotency, gate and locks as before; pricing
-- now comes from private.web_pos_price_sale.
create or replace function public.post_web_pos_cash_sale(
  target_business_id uuid, request_id uuid, sale_items jsonb, cash_received_ugx bigint
) returns table(sale_id uuid, receipt_number text, total_ugx bigint, change_ugx bigint, replayed boolean)
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  permission public.business_role;
  stored private.web_pos_sales%rowtype;
  request_fingerprint text;
  priced jsonb;
  work_lines jsonb;
  sum_subtotal bigint;
  sum_tax bigint;
  sum_total bigint;
  new_sale_id uuid;
  new_receipt text;
  source_record record;
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

  -- Validate item identities before casting UUIDs during stock-lock discovery.
  if exists (select 1 from jsonb_array_elements(sale_items) v
     where jsonb_typeof(v)<>'object' or (v->>'product_id') is null or (v->>'product_id') !~*
       '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception 'Invalid sale item' using errcode='22023';
  end if;
  -- Lock every desktop source in canonical order.
  for source_record in
    select distinct p.local_business_public_id as source_id
    from public.desktop_products p
    where p.business_id=target_business_id
      and p.id in (select (v->>'product_id')::uuid from jsonb_array_elements(sale_items) v)
    order by p.local_business_public_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'akilibiz-stock:' || target_business_id::text || ':' || source_record.source_id,0
    ));
  end loop;

  priced := private.web_pos_price_sale(target_business_id, sale_items);
  work_lines := priced->'lines';
  sum_subtotal := (priced->>'subtotal_ugx')::bigint;
  sum_tax := (priced->>'tax_ugx')::bigint;
  sum_total := (priced->>'total_ugx')::bigint;
  if cash_received_ugx < sum_total then
    raise exception 'Cash received is less than amount payable'
      using errcode='23514';
  end if;

  new_sale_id := gen_random_uuid();
  new_receipt := 'WEB-' || replace(new_sale_id::text,'-','');
  insert into private.web_pos_sales (
    id,business_id,actor_id,idempotency_key,request_digest,
    receipt_number,subtotal_ugx,tax_ugx,total_ugx,cash_tendered_ugx,change_ugx
  ) values (
    new_sale_id,target_business_id,actor,request_id,request_fingerprint,
    new_receipt,sum_subtotal,sum_tax,sum_total,
    cash_received_ugx,cash_received_ugx-sum_total
  );
  insert into private.web_pos_sale_lines (
    business_id,sale_id,product_id,line_number,quantity_milli,
    unit_price_ugx,subtotal_ugx,tax_ugx,total_ugx
  ) select target_business_id,new_sale_id,lines.product_id,lines.line_number,
    lines.quantity_milli,lines.unit_price_ugx,lines.subtotal_ugx,
    lines.tax_ugx,lines.total_ugx
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );
  insert into private.web_pos_stock_holds (
    business_id,sale_id,product_id,quantity_milli
  ) select target_business_id,new_sale_id,lines.product_id,lines.quantity_milli
    from jsonb_to_recordset(work_lines) as lines(
      line_number integer, product_id uuid, quantity_milli bigint,
      unit_price_ugx bigint, subtotal_ugx bigint, tax_ugx bigint, total_ugx bigint
    );
  insert into private.web_pos_payments (
    business_id,sale_id,method,status,amount_ugx
  ) values (target_business_id,new_sale_id,'cash','confirmed',sum_total);
  insert into private.web_pos_reconciliation_outbox (
    business_id,sale_id,event_payload
  ) values (
    target_business_id,new_sale_id,
    jsonb_build_object(
      'sale_id',new_sale_id,'receipt_number',new_receipt,
      'currency','UGX','subtotal_ugx',sum_subtotal,
      'tax_ugx',sum_tax,'total_ugx',sum_total,
      'cash_tendered_ugx',cash_received_ugx,
      'change_ugx',cash_received_ugx-sum_total,
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
  return query select new_sale_id,new_receipt,sum_total,cash_received_ugx-sum_total,false;
end $$;
