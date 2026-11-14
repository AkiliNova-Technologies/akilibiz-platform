-- Web purchase-order PREPARATION ONLY. No purchase, VAT, stock, or payable posting.
-- No inbound desktop inbox or outbound request enabled by this migration.
-- The existing supplier table has a UUID primary key and a source-specific
-- composite uniqueness constraint, but not yet (business_id,id).
-- Preserve a database-enforced tenant-bound supplier reference.
alter table public.desktop_suppliers
 add constraint desktop_suppliers_business_draft_ref unique(business_id,id);

create table public.web_purchase_order_drafts (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  supplier_id uuid not null,
  source_business_public_id text not null check(char_length(source_business_public_id) between 1 and 128),
  po_number text not null check(char_length(btrim(po_number)) between 1 and 100),
  order_date date not null,
  expected_delivery date check(expected_delivery is null or expected_delivery>=order_date),
  notes text check(notes is null or char_length(notes)<=2000),
  lines jsonb not null check(jsonb_typeof(lines)='array' and
    jsonb_array_length(lines) between 1 and 100 and pg_column_size(lines)<=16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,id),
  foreign key (business_id,supplier_id)
    references public.desktop_suppliers(business_id,id) on delete restrict
);
create index web_purchase_order_drafts_by_owner on
 public.web_purchase_order_drafts(business_id,created_by,updated_at desc,id);
alter table public.web_purchase_order_drafts enable row level security;
alter table public.web_purchase_order_drafts force row level security;
revoke all on public.web_purchase_order_drafts
 from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.web_purchase_order_drafts to authenticated;
create policy web_purchase_order_drafts_select on public.web_purchase_order_drafts
 for select to authenticated using (
 created_by=(select auth.uid()) and exists (
 select 1 from public.business_memberships m
 where m.business_id=web_purchase_order_drafts.business_id and m.user_id=(select auth.uid())
   and m.active and m.role in ('owner','manager')));
create policy web_purchase_order_drafts_insert on public.web_purchase_order_drafts
 for insert to authenticated with check (
 created_by=(select auth.uid()) and exists (
 select 1 from public.business_memberships m
 where m.business_id=web_purchase_order_drafts.business_id and m.user_id=(select auth.uid())
   and m.active and m.role in ('owner','manager')));
create policy web_purchase_order_drafts_update on public.web_purchase_order_drafts
 for update to authenticated using (
 created_by=(select auth.uid()) and exists (
 select 1 from public.business_memberships m
 where m.business_id=web_purchase_order_drafts.business_id and m.user_id=(select auth.uid())
   and m.active and m.role in ('owner','manager')))
 with check (
 created_by=(select auth.uid()) and exists (
 select 1 from public.business_memberships m
 where m.business_id=web_purchase_order_drafts.business_id and m.user_id=(select auth.uid())
   and m.active and m.role in ('owner','manager')));
create policy web_purchase_order_drafts_delete on public.web_purchase_order_drafts
 for delete to authenticated using (
 created_by=(select auth.uid()) and exists (
 select 1 from public.business_memberships m
 where m.business_id=web_purchase_order_drafts.business_id and m.user_id=(select auth.uid())
   and m.active and m.role in ('owner','manager')));

-- Identity and supplier source are immutable on update. A new draft is needed
-- to select another supplier/device origin. The server validates source IDs.
create function private.protect_web_purchase_order_draft_identity()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.business_id is distinct from old.business_id
  or new.created_by is distinct from old.created_by
  or new.supplier_id is distinct from old.supplier_id
  or new.source_business_public_id is distinct from old.source_business_public_id
 then
   raise exception 'Purchase order draft identity cannot be changed' using errcode='42501';
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.protect_web_purchase_order_draft_identity()
 from public,anon,authenticated,service_role;
create trigger protect_web_purchase_order_draft_identity before update
 on public.web_purchase_order_drafts for each row
 execute function private.protect_web_purchase_order_draft_identity();

-- Keep direct table API writes safe too. Source keys and money are checked
-- at the database boundary; the browser is NOT a trusted posting system.
create function private.validate_web_purchase_order_draft()
returns trigger language plpgsql set search_path='' as $$
declare
  supplier_source text;
  line jsonb;
  seen uuid[];
  product_source text;
  qty bigint;
  price bigint;
  sum_ugx numeric:=0;
begin
 select s.local_business_public_id into supplier_source
 from public.desktop_suppliers s
 where s.id=new.supplier_id and s.business_id=new.business_id and s.is_active;
 if supplier_source is null or supplier_source<>new.source_business_public_id then
  raise exception 'Supplier is not active in the selected desktop business' using errcode='23503';
 end if;
 if pg_column_size(new.lines)>16384 then
  raise exception 'Too many purchase order items' using errcode='22023';
 end if;
 seen:=array[]::uuid[];
 for line in select value from jsonb_array_elements(new.lines) loop
  if jsonb_typeof(line)<>'object' or
   (select count(*) from jsonb_object_keys(line))<>3 or
   not (line ?& array['product_id','quantity_milli','unit_price_ugx']) or
   (line->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
   jsonb_typeof(line->'quantity_milli')<>'number' or
   jsonb_typeof(line->'unit_price_ugx')<>'number' or
   (line->>'quantity_milli') !~ '^[0-9]+$' or
   (line->>'unit_price_ugx') !~ '^[0-9]+$'
  then raise exception 'Invalid purchase item data' using errcode='22023';
  end if;
  if (line->>'quantity_milli')::numeric>9223372036854775807 or
     (line->>'unit_price_ugx')::numeric>9223372036854775807
  then raise exception 'Purchase item is too large' using errcode='22023';
  end if;
  qty:=(line->>'quantity_milli')::bigint;
  price:=(line->>'unit_price_ugx')::bigint;
  if qty<=0 or (qty::numeric*price)%1000<>0 or
    (qty::numeric*price)/1000>9007199254740991 then
   raise exception 'Purchase item amount must be exact whole UGX' using errcode='22023';
  end if;
  if (line->>'product_id')::uuid=any(seen) then
   raise exception 'Duplicate product in purchase order' using errcode='22023';
  end if;
  seen:=array_append(seen,(line->>'product_id')::uuid);
  select p.local_business_public_id into product_source from public.desktop_products p
   where p.id=(line->>'product_id')::uuid and p.business_id=new.business_id
    and p.is_active;
  if product_source is null or product_source<>new.source_business_public_id then
   raise exception 'Product does not belong to the supplier desktop business'
     using errcode='23503';
  end if;
  sum_ugx:=sum_ugx+(qty::numeric*price)/1000;
  if sum_ugx>9007199254740991 then
   raise exception 'Order total exceeds supported exact UGX range'
    using errcode='22023';
  end if;
 end loop;
 return new;
end $$;
revoke all on function private.validate_web_purchase_order_draft()
 from public,anon,authenticated,service_role;
create trigger validate_web_purchase_order_draft before insert or update
 on public.web_purchase_order_drafts for each row
 execute function private.validate_web_purchase_order_draft();
