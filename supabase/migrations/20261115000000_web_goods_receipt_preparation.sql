-- Preparation only: no stock, supplier payables, VAT claims, or journals.
-- Final posting must be performed by the desktop receiving service.
create table public.web_goods_receipt_drafts(
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict,
 source_business_public_id text not null
   check(char_length(btrim(source_business_public_id)) between 1 and 128),
 purchase_order_id bigint not null check(purchase_order_id>0),
 receipt_number text not null check(char_length(btrim(receipt_number)) between 1 and 100),
 receipt_date date not null,
 supplier_reference text check(supplier_reference is null or char_length(supplier_reference)<=160),
 due_date date check(due_date is null or due_date>=receipt_date),
 lines jsonb not null check(jsonb_typeof(lines)='array' and
   jsonb_array_length(lines) between 1 and 100 and pg_column_size(lines)<=16384),
 supplier_vat jsonb check(supplier_vat is null or
   (jsonb_typeof(supplier_vat)='object' and pg_column_size(supplier_vat)<=16384)),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id),
 unique(business_id,source_business_public_id,receipt_number)
);
create index web_goods_receipt_drafts_owner_idx on
 public.web_goods_receipt_drafts(business_id,created_by,updated_at desc,id);

alter table public.web_goods_receipt_drafts enable row level security;
alter table public.web_goods_receipt_drafts force row level security;
revoke all on public.web_goods_receipt_drafts from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.web_goods_receipt_drafts to authenticated;
create policy web_goods_receipt_drafts_owner_select
 on public.web_goods_receipt_drafts for select to authenticated using (
  created_by=(select auth.uid()) and
  private.is_active_business_owner(web_goods_receipt_drafts.business_id));
create policy web_goods_receipt_drafts_owner_insert
 on public.web_goods_receipt_drafts for insert to authenticated with check (
  created_by=(select auth.uid()) and
  private.is_active_business_owner(web_goods_receipt_drafts.business_id));
create policy web_goods_receipt_drafts_owner_update
 on public.web_goods_receipt_drafts for update to authenticated using (
  created_by=(select auth.uid()) and
  private.is_active_business_owner(web_goods_receipt_drafts.business_id))
 with check (
  created_by=(select auth.uid()) and
  private.is_active_business_owner(web_goods_receipt_drafts.business_id));
create policy web_goods_receipt_drafts_owner_delete
 on public.web_goods_receipt_drafts for delete to authenticated using (
  created_by=(select auth.uid()) and
  private.is_active_business_owner(web_goods_receipt_drafts.business_id));

-- The business, owner, source and PO identity cannot be reassigned.
create function private.validate_web_goods_receipt_draft()
returns trigger language plpgsql set search_path='' as $$
declare
 po jsonb;
 row_item jsonb;
 order_line jsonb;
 invoice_line jsonb;
 seen_line_ids bigint[]:=array[]::bigint[];
 seen_product_ids bigint[]:=array[]::bigint[];
 line_id bigint;
 product_id bigint;
 qty bigint;
 cost bigint;
 ordered_qty bigint;
 received_qty bigint;
 total numeric:=0;
 i integer:=0;
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.business_id is distinct from old.business_id or
   new.created_by is distinct from old.created_by or
   new.source_business_public_id is distinct from old.source_business_public_id or
   new.purchase_order_id is distinct from old.purchase_order_id then
    raise exception 'A receipt draft cannot change its originating purchase order'
       using errcode='42501';
  end if;
 end if;
 if new.receipt_number ~ '[[:cntrl:]]' or
    new.source_business_public_id ~ '[[:cntrl:]]' then
    raise exception 'Invalid receipt reference' using errcode='22023';
 end if;
 select r.record into po from public.desktop_business_records r
 where r.business_id=new.business_id
   and r.local_business_public_id=new.source_business_public_id
   and r.entity_type='purchase_orders' and r.local_record_id=new.purchase_order_id;
 if po is null or po->>'status' not in ('Pending','Partially Received') then
  raise exception 'Active synchronized purchase order is required'
   using errcode='23503';
 end if;
 if (po->>'supplier_id') !~ '^[1-9][0-9]*$' then
  raise exception 'Purchase order supplier is invalid' using errcode='22023';
 end if;
 for row_item in select value from jsonb_array_elements(new.lines) loop
  if jsonb_typeof(row_item)<>'object' or
   (select count(*) from jsonb_object_keys(row_item))<>4 or
   not (row_item ?& array['purchase_order_line_id','product_id','quantity_milli','unit_cost_ugx'])
   or (row_item->>'purchase_order_line_id') !~ '^[1-9][0-9]*$'
   or (row_item->>'product_id') !~ '^[1-9][0-9]*$'
   or (row_item->>'quantity_milli') !~ '^[1-9][0-9]*$'
   or (row_item->>'unit_cost_ugx') !~ '^[0-9]+$'
   then raise exception 'Invalid delivered item' using errcode='22023';
  end if;
  if (row_item->>'purchase_order_line_id')::numeric>9223372036854775807 or
     (row_item->>'product_id')::numeric>9223372036854775807 or
     (row_item->>'quantity_milli')::numeric>9223372036854775807 or
     (row_item->>'unit_cost_ugx')::numeric>9223372036854775807 then
      raise exception 'Delivered item exceeds the supported range' using errcode='22003';
  end if;
  line_id:=(row_item->>'purchase_order_line_id')::bigint;
  product_id:=(row_item->>'product_id')::bigint;
  qty:=(row_item->>'quantity_milli')::bigint;
  cost:=(row_item->>'unit_cost_ugx')::bigint;
  if line_id=any(seen_line_ids) or product_id=any(seen_product_ids) then
   raise exception 'A received product may occur only once' using errcode='22023';
  end if;
  seen_line_ids:=array_append(seen_line_ids,line_id);
  seen_product_ids:=array_append(seen_product_ids,product_id);
  select r.record into order_line from public.desktop_business_records r
  where r.business_id=new.business_id
   and r.local_business_public_id=new.source_business_public_id
   and r.entity_type='purchase_order_lines' and r.local_record_id=line_id;
  if order_line is null or
   (order_line->>'purchase_order_id')::text is distinct from new.purchase_order_id::text or
   (order_line->>'product_id')::text is distinct from product_id::text or
   (order_line->>'quantity_milli') !~ '^[1-9][0-9]*$' or
   (order_line->>'received_quantity_milli') !~ '^[0-9]+$' then
    raise exception 'Delivered item does not belong to this purchase order'
       using errcode='23503';
  end if;
  ordered_qty:=(order_line->>'quantity_milli')::bigint;
  received_qty:=(order_line->>'received_quantity_milli')::bigint;
  if qty>ordered_qty-received_qty then
   raise exception 'Delivery exceeds the synchronized remaining order quantity'
     using errcode='22023';
  end if;
  if (qty::numeric*cost)%1000<>0 then
   raise exception 'Receipt cost must be an exact whole UGX amount' using errcode='22023';
  end if;
  total:=total+(qty::numeric*cost)/1000;
  if total>9007199254740991 then
   raise exception 'Receipt draft exceeds exact UGX range' using errcode='22003';
  end if;
 end loop;
 if new.supplier_vat is not null then
   if (select count(*) from jsonb_object_keys(new.supplier_vat))<>7 or
    not (new.supplier_vat ?& array[
     'source_kind','invoice_number','invoice_date','evidence_reference',
     'supplier_tin','declared_vat_ugx','lines']) or
    (new.supplier_vat->>'source_kind') not in ('EFRIS_E_INVOICE','TAX_INVOICE') or
    length(btrim(new.supplier_vat->>'invoice_number')) not between 1 and 100 or
    length(btrim(new.supplier_vat->>'evidence_reference')) not between 1 and 160 or
    (new.supplier_vat->>'invoice_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} or
    (new.supplier_vat->>'declared_vat_ugx') !~ '^[0-9]+
    jsonb_typeof(new.supplier_vat->'lines')<>'array' or
    jsonb_array_length(new.supplier_vat->'lines')<>jsonb_array_length(new.lines) then
     raise exception 'Supplier invoice evidence is incomplete' using errcode='22023';
   end if;
   if to_char((new.supplier_vat->>'invoice_date')::date,'YYYY-MM-DD')
      is distinct from new.supplier_vat->>'invoice_date' then
      raise exception 'Supplier invoice date is invalid' using errcode='22023';
   end if;
   i:=0;
   for invoice_line in select value from jsonb_array_elements(new.supplier_vat->'lines') loop
    i:=i+1;
    if jsonb_typeof(invoice_line)<>'object' or
      (select count(*) from jsonb_object_keys(invoice_line))<>3 or
      not (invoice_line ?& array['product_id','classification_code','tax_inclusive']) or
      (invoice_line->>'product_id')::text is distinct from
        (new.lines->(i-1)->>'product_id')::text or
      (invoice_line->>'classification_code') not in
        ('STANDARD_RATED','ZERO_RATED','EXEMPT','OUT_OF_SCOPE') or
      jsonb_typeof(invoice_line->'tax_inclusive')<>'boolean' then
      raise exception 'Supplier invoice item evidence does not match the delivery'
        using errcode='22023';
    end if;
   end loop;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.validate_web_goods_receipt_draft()
 from public,anon,authenticated,service_role;
create trigger validate_web_goods_receipt_draft
 before insert or update on public.web_goods_receipt_drafts
 for each row execute function private.validate_web_goods_receipt_draft();
 or
    (new.supplier_vat->>'declared_vat_ugx') !~ '^[0-9]+$' or
    jsonb_typeof(new.supplier_vat->'lines')<>'array' or
    jsonb_array_length(new.supplier_vat->'lines')<>jsonb_array_length(new.lines) then
     raise exception 'Supplier invoice evidence is incomplete' using errcode='22023';
   end if;
   i:=0;
   for invoice_line in select value from jsonb_array_elements(new.supplier_vat->'lines') loop
    i:=i+1;
    if jsonb_typeof(invoice_line)<>'object' or
      (select count(*) from jsonb_object_keys(invoice_line))<>3 or
      not (invoice_line ?& array['product_id','classification_code','tax_inclusive']) or
      (invoice_line->>'product_id')::text is distinct from
        (new.lines->(i-1)->>'product_id')::text or
      (invoice_line->>'classification_code') not in
        ('STANDARD_RATED','ZERO_RATED','EXEMPT','OUT_OF_SCOPE') or
      jsonb_typeof(invoice_line->'tax_inclusive')<>'boolean' then
      raise exception 'Supplier invoice item evidence does not match the delivery'
        using errcode='22023';
    end if;
   end loop;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.validate_web_goods_receipt_draft()
 from public,anon,authenticated,service_role;
create trigger validate_web_goods_receipt_draft
 before insert or update on public.web_goods_receipt_drafts
 for each row execute function private.validate_web_goods_receipt_draft();
 or
    length(new.supplier_vat->>'declared_vat_ugx')>16 or
    (new.supplier_vat->>'declared_vat_ugx')::numeric>9007199254740991 or
    (new.supplier_vat->>'supplier_tin')~'[[:cntrl:]]' or
    length(coalesce(new.supplier_vat->>'supplier_tin',''))>100 or
    jsonb_typeof(new.supplier_vat->'lines')<>'array' or
    jsonb_array_length(new.supplier_vat->'lines')<>jsonb_array_length(new.lines) then
     raise exception 'Supplier invoice evidence is incomplete' using errcode='22023';
   end if;
   i:=0;
   for invoice_line in select value from jsonb_array_elements(new.supplier_vat->'lines') loop
    i:=i+1;
    if jsonb_typeof(invoice_line)<>'object' or
      (select count(*) from jsonb_object_keys(invoice_line))<>3 or
      not (invoice_line ?& array['product_id','classification_code','tax_inclusive']) or
      (invoice_line->>'product_id')::text is distinct from
        (new.lines->(i-1)->>'product_id')::text or
      (invoice_line->>'classification_code') not in
        ('STANDARD_RATED','ZERO_RATED','EXEMPT','OUT_OF_SCOPE') or
      jsonb_typeof(invoice_line->'tax_inclusive')<>'boolean' then
      raise exception 'Supplier invoice item evidence does not match the delivery'
        using errcode='22023';
    end if;
   end loop;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.validate_web_goods_receipt_draft()
 from public,anon,authenticated,service_role;
create trigger validate_web_goods_receipt_draft
 before insert or update on public.web_goods_receipt_drafts
 for each row execute function private.validate_web_goods_receipt_draft();
 or
    (new.supplier_vat->>'declared_vat_ugx') !~ '^[0-9]+$' or
    jsonb_typeof(new.supplier_vat->'lines')<>'array' or
    jsonb_array_length(new.supplier_vat->'lines')<>jsonb_array_length(new.lines) then
     raise exception 'Supplier invoice evidence is incomplete' using errcode='22023';
   end if;
   i:=0;
   for invoice_line in select value from jsonb_array_elements(new.supplier_vat->'lines') loop
    i:=i+1;
    if jsonb_typeof(invoice_line)<>'object' or
      (select count(*) from jsonb_object_keys(invoice_line))<>3 or
      not (invoice_line ?& array['product_id','classification_code','tax_inclusive']) or
      (invoice_line->>'product_id')::text is distinct from
        (new.lines->(i-1)->>'product_id')::text or
      (invoice_line->>'classification_code') not in
        ('STANDARD_RATED','ZERO_RATED','EXEMPT','OUT_OF_SCOPE') or
      jsonb_typeof(invoice_line->'tax_inclusive')<>'boolean' then
      raise exception 'Supplier invoice item evidence does not match the delivery'
        using errcode='22023';
    end if;
   end loop;
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.validate_web_goods_receipt_draft()
 from public,anon,authenticated,service_role;
create trigger validate_web_goods_receipt_draft
 before insert or update on public.web_goods_receipt_drafts
 for each row execute function private.validate_web_goods_receipt_draft();
