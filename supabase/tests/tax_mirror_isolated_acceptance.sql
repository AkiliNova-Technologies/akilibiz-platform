-- CI-only qualification of VAT evidence entity snapshots and owner/device scope.
\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

do $$
declare
  domain text;
  domains text[] := array[
    'product_vat_reviews','import_vat_documents',
    'vat_credit_evidence_events','vat_credit_evidence_corrections'
  ];
  batch_id uuid;
  n bigint;
begin
  foreach domain in array domains loop
    batch_id := gen_random_uuid();
    perform public.stage_desktop_business_snapshot_chunk(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      batch_id,domain,1,1,
      jsonb_build_array(jsonb_build_object('id',15,
        'record',jsonb_build_object('id',15,'business_id',1,
          'review_status','documentary only')))
    );
    select public.finalize_desktop_business_snapshot(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      batch_id,domain,1) into n;
    if n<>1 then raise exception 'VAT mirror not committed: %',domain; end if;
    perform public.stage_desktop_business_snapshot_chunk(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      batch_id,domain,1,1,
      jsonb_build_array(jsonb_build_object('id',15,
        'record',jsonb_build_object('id',15,'business_id',1,
          'review_status','documentary only')))
    );
    begin
      perform public.stage_desktop_business_snapshot_chunk(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
        '33333333-3333-4333-8333-333333333333',
        batch_id,domain,1,1,
        jsonb_build_array(jsonb_build_object('id',15,
          'record',jsonb_build_object('id',15,'business_id',1,
            'review_status','mutated fact')))
      );
      -- Committed batches return their count without comparing another payload;
      -- no change in persisted records is permitted.
    exception when unique_violation then null;
    end;
    select count(*) into n from public.desktop_business_records
      where business_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        and entity_type=domain
        and record->>'review_status'='documentary only';
    if n<>1 then raise exception 'Mirror changed immutable record: %',domain; end if;
    begin
      perform public.finalize_desktop_business_snapshot(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
        '33333333-3333-4333-8333-333333333333',
        gen_random_uuid(),domain,2);
      raise exception 'Unknown batch accepted';
    exception when foreign_key_violation then null;
    end;
  end loop;
  if (select count(*) from public.desktop_business_records
      where business_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>4 then
    raise exception 'VAT evidence mirrors missing records';
  end if;
  -- Same authenticated owner may not use another tenant's source.
  begin
    perform public.stage_desktop_business_snapshot_chunk(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','source-b',
      '44444444-4444-4444-8444-444444444444',
      gen_random_uuid(),'product_vat_reviews',1,0,'[]'::jsonb);
    raise exception 'Cross-business VAT mirror accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- RLS: a tenant owner sees only their own VAT evidence records.
grant usage on schema public,auth to authenticated;
grant select on public.business_memberships to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare n bigint;
begin
  select count(*) into n from public.desktop_business_records
  where entity_type in ('product_vat_reviews','import_vat_documents',
    'vat_credit_evidence_events','vat_credit_evidence_corrections');
  if n<>4 then raise exception 'Owner A VAT visibility mismatch: %',n; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
  if exists (select 1 from public.desktop_business_records
     where entity_type in ('product_vat_reviews','import_vat_documents',
       'vat_credit_evidence_events','vat_credit_evidence_corrections')) then
    raise exception 'Owner B read business A VAT evidence';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
update private.desktop_devices set revoked_at=now()
 where device_public_id='33333333-3333-4333-8333-333333333333';
do $$
begin
  begin
    perform public.stage_desktop_business_snapshot_chunk(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      gen_random_uuid(),'import_vat_documents',2,0,'[]'::jsonb);
    raise exception 'Revoked device uploaded VAT evidence';
  exception when insufficient_privilege then null;
  end;
end $$;
