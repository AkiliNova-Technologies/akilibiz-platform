-- Additive tax evidence entity expansion for the existing qualified, tenant-scoped
-- immutable desktop mirror RPCs. Preserve all identity, device, RLS and
-- generation checks; do not enable any reverse writes or URA operations.

create or replace function public.stage_desktop_business_snapshot_chunk(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  source_batch_id uuid,
  entity_type text,
  source_generation bigint,
  expected_count bigint,
  records jsonb
) returns integer
language plpgsql security definer set search_path=''
as $$
declare
  saved private.desktop_mirror_batches%rowtype;
  item jsonb;
  local_id bigint;
  existing_record jsonb;
  submitted integer:=0;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id
  );
  if source_batch_id is null or entity_type not in ('product_variant_groups','product_variant_group_members','sales','sale_items','sale_payments','supplier_payments','supplier_payables','supplier_payment_allocations','finance_transactions','authoritative_expenses','expense_payables','accounting_periods','accounting_period_actions','purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines','supplier_purchase_vat_evidence','supplier_input_vat_reviews','supplier_input_vat_reversals','product_vat_reviews','import_vat_documents','vat_credit_evidence_events','vat_credit_evidence_corrections','tax_settings','tax_configurations','stock_movements','business_profile','business_profiles','receipt_settings','journal_entries','journal_lines','chart_of_accounts','accounting_opening_reviews','expense_settlements','expense_tax_evidence','authoritative_financial_events','authoritative_expense_voids','authoritative_expense_corrections','authoritative_expense_refunds','customer_credit_events')
     or source_generation is null or source_generation<=0
     or expected_count is null or expected_count<0 or expected_count>1000000
     or records is null or jsonb_typeof(records)<>'array'
     or jsonb_array_length(records)>100 then
    raise exception 'Invalid desktop mirror batch' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-mirror:' || target_business_id::text || ':' ||
       source_business_public_id || ':' || entity_type,0
  ));
  insert into private.desktop_mirror_batches(
    batch_id,business_id,source_business_public_id,source_device_public_id,
    entity_type,source_generation,expected_count
  ) values (
    source_batch_id,target_business_id,source_business_public_id,source_device_public_id,
    entity_type,source_generation,expected_count
  ) on conflict(batch_id) do nothing;
  select * into saved from private.desktop_mirror_batches b
   where b.batch_id=source_batch_id for update;
  if not found or saved.business_id<>target_business_id
     or saved.source_business_public_id<>stage_desktop_business_snapshot_chunk.source_business_public_id
     or saved.source_device_public_id<>stage_desktop_business_snapshot_chunk.source_device_public_id
     or saved.entity_type<>stage_desktop_business_snapshot_chunk.entity_type
     or saved.source_generation<>stage_desktop_business_snapshot_chunk.source_generation
     or saved.expected_count<>expected_count then
    raise exception 'Mirror batch identity conflict' using errcode='23505';
  end if;
  if saved.state='committed' then
    return (select count(*)::integer from private.desktop_mirror_batch_rows r
     where r.batch_id=source_batch_id);
  end if;
  for item in select value from jsonb_array_elements(records) loop
    if jsonb_typeof(item)<>'object' or (item->>'id') !~ '^[1-9][0-9]*$'
       or length(item->>'id')>19
       or jsonb_typeof(item->'record')<>'object'
       or (item->'record'->>'id') is distinct from (item->>'id') then
      raise exception 'Invalid mirror row identity or payload' using errcode='22023';
    end if;
    if (item->>'id')::numeric > 9223372036854775807::numeric then
      raise exception 'Mirror record ID exceeds bigint range' using errcode='22003';
    end if;
    local_id := (item->>'id')::bigint;
    select r.record into existing_record from private.desktop_mirror_batch_rows r
     where r.batch_id=source_batch_id and r.local_record_id=local_id;
    if found then
      if existing_record is distinct from item->'record' then
        raise exception 'Mirror row changed while uploading' using errcode='23505';
      end if;
    else
      insert into private.desktop_mirror_batch_rows(batch_id,local_record_id,record)
       values(source_batch_id,local_id,item->'record');
    end if;
    submitted:=submitted+1;
  end loop;
  return submitted;
end $$;
revoke all on function public.stage_desktop_business_snapshot_chunk(
  uuid,text,uuid,uuid,text,bigint,bigint,jsonb
) from public,anon,authenticated;
grant execute on function public.stage_desktop_business_snapshot_chunk(
  uuid,text,uuid,uuid,text,bigint,bigint,jsonb
) to authenticated;

create or replace function public.finalize_desktop_business_snapshot(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  source_batch_id uuid,
  entity_type text,
  source_generation bigint
) returns bigint
language plpgsql security definer set search_path=''
as $$
declare
  batch private.desktop_mirror_batches%rowtype;
  head private.desktop_mirror_heads%rowtype;
  received_count bigint;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id
  );
  if source_batch_id is null or entity_type not in ('product_variant_groups','product_variant_group_members','sales','sale_items','sale_payments','supplier_payments','supplier_payables','supplier_payment_allocations','finance_transactions','authoritative_expenses','expense_payables','accounting_periods','accounting_period_actions','purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines','supplier_purchase_vat_evidence','supplier_input_vat_reviews','supplier_input_vat_reversals','product_vat_reviews','import_vat_documents','vat_credit_evidence_events','vat_credit_evidence_corrections','tax_settings','tax_configurations','stock_movements','business_profile','business_profiles','receipt_settings','journal_entries','journal_lines','chart_of_accounts','accounting_opening_reviews','expense_settlements','expense_tax_evidence','authoritative_financial_events','authoritative_expense_voids','authoritative_expense_corrections','authoritative_expense_refunds','customer_credit_events')
     or source_generation is null or source_generation<=0 then
    raise exception 'Invalid mirror finalization' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-mirror:' || target_business_id::text || ':' ||
       source_business_public_id || ':' || entity_type,0
  ));
  select * into batch from private.desktop_mirror_batches b
   where b.batch_id=source_batch_id for update;
  if not found or batch.business_id<>target_business_id
     or batch.source_business_public_id<>finalize_desktop_business_snapshot.source_business_public_id
     or batch.source_device_public_id<>finalize_desktop_business_snapshot.source_device_public_id
     or batch.entity_type<>finalize_desktop_business_snapshot.entity_type
     or batch.source_generation<>finalize_desktop_business_snapshot.source_generation then
    raise exception 'Mirror batch not found for this source' using errcode='23503';
  end if;
  if batch.state='committed' then return batch.expected_count; end if;
  select count(*) into received_count from private.desktop_mirror_batch_rows r
    where r.batch_id=source_batch_id;
  if received_count<>batch.expected_count then
    raise exception 'Mirror batch is incomplete' using errcode='23514';
  end if;
  select * into head from private.desktop_mirror_heads h
   where h.business_id=target_business_id
     and h.source_business_public_id=finalize_desktop_business_snapshot.source_business_public_id
     and h.entity_type=finalize_desktop_business_snapshot.entity_type for update;
  if found and head.committed_generation>=source_generation then
    raise exception 'Stale or conflicting mirror generation' using errcode='23505';
  end if;
  -- Publish a complete snapshot atomically; a failed chunk never becomes
  -- visible to readers, and retries cannot roll back a newer generation.
  delete from public.desktop_business_records r
   where r.business_id=target_business_id
     and r.local_business_public_id=finalize_desktop_business_snapshot.source_business_public_id
     and r.entity_type=finalize_desktop_business_snapshot.entity_type;
  insert into public.desktop_business_records(
    business_id,local_business_public_id,entity_type,local_record_id,record
  )
  select target_business_id,source_business_public_id,entity_type,
    r.local_record_id,r.record
  from private.desktop_mirror_batch_rows r where r.batch_id=source_batch_id;
  insert into private.desktop_mirror_heads(
    business_id,source_business_public_id,entity_type,
    committed_generation,committed_batch_id
  ) values(
    target_business_id,source_business_public_id,entity_type,
    source_generation,source_batch_id
  ) on conflict on constraint desktop_mirror_heads_pkey
    do update set committed_generation=excluded.committed_generation,
      committed_batch_id=excluded.committed_batch_id,committed_at=now();
  update private.desktop_mirror_batches
    set state='committed',committed_at=now() where batch_id=source_batch_id;
  return received_count;
end $$;
revoke all on function public.finalize_desktop_business_snapshot(
  uuid,text,uuid,uuid,text,bigint
) from public,anon,authenticated;
grant execute on function public.finalize_desktop_business_snapshot(
  uuid,text,uuid,uuid,text,bigint
) to authenticated;
