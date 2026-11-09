\set ON_ERROR_STOP on

begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'assertion failed: %', message;
  end if;
end;
$$;

create function pg_temp.expect_sqlstate(expected_state text, statement text, message text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then
      return;
    end if;
    raise exception 'assertion failed: % (expected SQLSTATE %, got %: %)',
      message, expected_state, sqlstate, sqlerrm;
  end;
  raise exception 'assertion failed: % (statement succeeded)', message;
end;
$$;

insert into auth.users(id,email) values
  ('10000000-0000-0000-0000-000000000001','phase1-owner@example.test'),
  ('20000000-0000-0000-0000-000000000002','phase1-other@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select hosted_business_id as owner_business_id, hosted_device_id as owner_device_row_id,
       created as owner_business_created
from public.register_desktop_business(
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'Phase 1 Integration Business',null,'owner@example.test',null,'Africa/Kampala','UGX'
) \gset

select pg_temp.assert_true(:'owner_business_created'::boolean,
  'first desktop business registration must create a tenant');

select created as owner_retry_created
from public.register_desktop_business(
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'Phase 1 Integration Business',null,'owner@example.test',null,'Africa/Kampala','UGX'
) \gset
select pg_temp.assert_true(not :'owner_retry_created'::boolean,
  'desktop business registration retry must be idempotent');

-- Pairing claims require the issuing owner and are retry-safe after a lost reply.
select pairing_code from public.create_desktop_pairing(:'owner_business_id') \gset
select hosted_business_id as paired_business_id, hosted_device_id as paired_device_id
from public.claim_desktop_pairing(
  :'pairing_code','cccccccccccccccccccccccccccccccc',
  'cccccccc-0000-4000-8000-000000000003'
) \gset
select hosted_business_id as paired_retry_business_id, hosted_device_id as paired_retry_device_id
from public.claim_desktop_pairing(
  :'pairing_code','cccccccccccccccccccccccccccccccc',
  'cccccccc-0000-4000-8000-000000000003'
) \gset
select pg_temp.assert_true(
  :'paired_business_id'::uuid=:'owner_business_id'::uuid
  and :'paired_retry_business_id'::uuid=:'paired_business_id'::uuid
  and :'paired_retry_device_id'::uuid=:'paired_device_id'::uuid,
  'pairing retry must return the original device receipt');

-- Core RPC 1: atomic catalogue snapshot.
select categories_uploaded, products_uploaded
from public.upload_desktop_catalogue(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '[{"id":1,"name":"Beverages","slug":"beverages","description":"","active":true}]',
  '[{"id":10,"category_id":1,"name":"Tea","sku":"TEA-1","barcode":null,"description":"","brand":"Akili","stock_unit":"item","selling_price_ugx":5000,"cost_price_ugx":3000,"active":true}]'
) \gset
select pg_temp.assert_true(:'categories_uploaded'::int=1 and :'products_uploaded'::int=1,
  'catalogue snapshot counts must match');

-- Core RPC 2: ordered catalogue event with duplicate acknowledgement.
select pg_temp.assert_true(public.apply_desktop_catalogue_event(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001','11111111111111111111111111111111',
  'product',10,'upsert',
  '{"id":10,"category_id":1,"name":"Tea Updated","sku":"TEA-1","barcode":null,"description":"","brand":"Akili","stock_unit":"item","selling_price_ugx":5500,"cost_price_ugx":3000,"active":true}'
), 'catalogue event must be accepted');
select pg_temp.assert_true(public.apply_desktop_catalogue_event(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001','11111111111111111111111111111111',
  'product',10,'upsert',
  '{"id":10,"category_id":1,"name":"Tea Updated","sku":"TEA-1","barcode":null,"description":"","brand":"Akili","stock_unit":"item","selling_price_ugx":5500,"cost_price_ugx":3000,"active":true}'
), 'catalogue event retry must be acknowledged');
-- Core RPC 3: contact directory snapshot.
select customers_uploaded, suppliers_uploaded
from public.upload_desktop_contacts(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '[{"public_id":"30000000-0000-4000-8000-000000000003","name":"Customer One","email":"customer@example.test","phone":"+256700000001","address":"Kampala","customer_type":"retail","loyalty_points":10,"active":true}]',
  '[{"public_id":"40000000-0000-4000-8000-000000000004","name":"Supplier One","contact_person":"Agent","phone":"+256700000002","email":"supplier@example.test","address":"Kampala","payment_terms":"cash","active":true}]'
) \gset
select pg_temp.assert_true(:'customers_uploaded'::int=1 and :'suppliers_uploaded'::int=1,
  'contact snapshot counts must match');

-- Core RPC 4: pre-checkpoint inventory snapshot.
select public.upload_desktop_inventory_positions(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '[{"product_id":10,"on_hand_milli":100,"reserved_milli":2,"damaged_milli":1,"minimum_milli":10,"maximum_milli":500}]'
) as positions_uploaded \gset
select pg_temp.assert_true(:'positions_uploaded'::int=1,
  'inventory snapshot must upload one position');

-- Inventory checkpoint, deterministic retry and stale-snapshot write guard.
select hosted_checkpoint_id, accepted_movement_watermark
from public.confirm_desktop_inventory_checkpoint(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000005',10,
  '[{"product_id":10,"on_hand_milli":100,"reserved_milli":2,"damaged_milli":1,"minimum_milli":10,"maximum_milli":500}]'
) \gset
select pg_temp.assert_true(:'accepted_movement_watermark'::bigint=10,
  'checkpoint watermark must be accepted exactly');
select hosted_checkpoint_id as retry_checkpoint_id
from public.confirm_desktop_inventory_checkpoint(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000005',10,
  '[{"product_id":10,"on_hand_milli":100,"reserved_milli":2,"damaged_milli":1,"minimum_milli":10,"maximum_milli":500}]'
) \gset
select pg_temp.assert_true(:'retry_checkpoint_id'::uuid=:'hosted_checkpoint_id'::uuid,
  'checkpoint retry must return the original receipt');
select pg_temp.expect_sqlstate('23514', format(
  'select public.upload_desktop_inventory_positions(%L,%L,%L,%L::jsonb)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '[{"product_id":10,"on_hand_milli":99,"reserved_milli":2,"damaged_milli":1,"minimum_milli":10,"maximum_milli":500}]'
), 'legacy inventory snapshots must be blocked after checkpoint');

-- Ordered movement replay, deterministic retry, duplicate and order protection.
select public.apply_desktop_inventory_movement(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000006',11,10,
  '{"source_movement_id":11,"product_local_id":10,"quantity_change_milli":5,"stock_before_milli":100,"stock_after_milli":105}'
) as movement_receipt_id \gset
select public.apply_desktop_inventory_movement(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000006',11,10,
  '{"source_movement_id":11,"product_local_id":10,"quantity_change_milli":5,"stock_before_milli":100,"stock_after_milli":105}'
) as retry_movement_receipt_id \gset
select pg_temp.assert_true(:'movement_receipt_id'::uuid=:'retry_movement_receipt_id'::uuid,
  'movement retry must return the original receipt');
select pg_temp.expect_sqlstate('23514', format(
  'select public.apply_desktop_inventory_movement(%L,%L,%L,%L,13,10,%L::jsonb)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000007',
  '{"source_movement_id":13,"product_local_id":10,"quantity_change_milli":1,"stock_before_milli":105,"stock_after_milli":106}'
), 'movement predecessor mismatches must be rejected');

-- Core RPC 5: post-checkpoint non-ledger metadata.
select public.upload_desktop_inventory_metadata(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '[{"product_id":10,"reserved_milli":3,"damaged_milli":1,"minimum_milli":12,"maximum_milli":600}]'
) as metadata_uploaded \gset
select pg_temp.assert_true(:'metadata_uploaded'::int=1,
  'inventory metadata must upload after checkpoint');
select pg_temp.assert_true((select on_hand_milli=105 and reserved_milli=3
  from public.list_desktop_effective_inventory(:'owner_business_id') where local_product_id=10),
  'effective inventory must combine replayed on-hand with current metadata');

-- Immutable business mirror: partial batches are invisible; publication is atomic.
select public.stage_desktop_business_snapshot_chunk(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000008','sales',1,1,
  '[{"id":1,"record":{"id":1,"total_ugx":5000}}]'
) as mirror_staged \gset
select pg_temp.assert_true(:'mirror_staged'::int=1,'mirror row must stage');
select public.stage_desktop_business_snapshot_chunk(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000008','sales',1,1,
  '[{"id":1,"record":{"id":1,"total_ugx":5000}}]'
) as mirror_retry_staged \gset
select pg_temp.assert_true(:'mirror_retry_staged'::int=1,'mirror chunk retry must be idempotent');
select public.finalize_desktop_business_snapshot(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000008','sales',1
) as mirror_published \gset
select pg_temp.assert_true(:'mirror_published'::bigint=1,'complete mirror must publish atomically');
select pg_temp.assert_true((select count(*)=1 from public.desktop_business_records
  where business_id=:'owner_business_id' and entity_type='sales'),
  'published mirror must contain the complete snapshot');
select public.stage_desktop_business_snapshot_chunk(
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000009','sales',2,2,
  '[{"id":2,"record":{"id":2,"total_ugx":7000}}]'
);
select pg_temp.expect_sqlstate('23514', format(
  'select public.finalize_desktop_business_snapshot(%L,%L,%L,%L,%L,2)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000009','sales'
), 'incomplete mirror batch must not publish');
select pg_temp.assert_true((select count(*)=1 from public.desktop_business_records
  where business_id=:'owner_business_id' and entity_type='sales' and local_record_id=1),
  'failed mirror generation must leave the prior snapshot intact');

-- Authentication, authorization and tenant isolation.
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
select hosted_business_id as other_business_id
from public.register_desktop_business(
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbb-0000-4000-8000-000000000002',
  'Other Tenant',null,'other@example.test',null,'Africa/Kampala','UGX'
) \gset
select pg_temp.assert_true((select count(*)=0 from public.desktop_products
  where business_id=:'owner_business_id'),
  'RLS must hide the first tenant from another owner');
select pg_temp.expect_sqlstate('42501', format(
  'select public.upload_desktop_contacts(%L,%L,%L,%L::jsonb,%L::jsonb)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001','[]','[]'
), 'another owner must not upload into the first tenant');
select pg_temp.expect_sqlstate('42501',
  'select count(*) from private.desktop_inventory_checkpoints',
  'authenticated clients must not read private synchronization tables');

reset role;
update private.desktop_devices set revoked_at=now()
where device_public_id='aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect_sqlstate('42501', format(
  'select public.upload_desktop_contacts(%L,%L,%L,%L::jsonb,%L::jsonb)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001','[]','[]'
), 'revoked desktop devices must be rejected');

set local request.jwt.claim.sub = '';
select pg_temp.expect_sqlstate('42501', format(
  'select public.upload_desktop_contacts(%L,%L,%L,%L::jsonb,%L::jsonb)',
  :'owner_business_id','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001','[]','[]'
), 'missing authentication must be rejected');

reset role;
select pg_temp.assert_true((select count(*)=1 from private.desktop_catalogue_event_receipts
  where business_id=:'owner_business_id'), 'catalogue event retry must create one receipt');
select pg_temp.assert_true((select count(*)=1 from private.desktop_inventory_movement_receipts
  where business_id=:'owner_business_id'), 'movement retry must remain exactly-once');
select pg_temp.assert_true((select count(*)=1 from private.desktop_inventory_checkpoints
  where business_id=:'owner_business_id'), 'checkpoint retry must remain exactly-once');

rollback;
\echo 'native Phase 1 synchronization integration tests passed'
