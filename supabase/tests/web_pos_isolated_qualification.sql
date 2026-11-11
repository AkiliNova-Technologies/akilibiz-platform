-- Executed on an ephemeral PostgreSQL service by CI only.
-- Tests disabled-by-default gate, idempotency, tenant scope, matching source
-- receipt/ACK, held stock and rejection of duplicate or overstocked sales.
\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub',
 '11111111-1111-4111-8111-111111111111',false);

insert into private.web_pos_posting_controls (business_id)
 values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into private.web_pos_tax_settings(
 business_id,vat_registered,vat_rate_bps,verified_at,verified_by)
 values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false,0,now(),
 '11111111-1111-4111-8111-111111111111');
insert into private.web_pos_product_tax_rules(
 business_id,product_id,taxable,tax_inclusive,verified_at)
 values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '55555555-5555-4555-8555-555555555555',false,false,now());

do $$
begin
 begin
   perform * from public.post_web_pos_cash_sale(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '77777777-7777-4777-8777-777777777777',
    '[{"product_id":"55555555-5555-4555-8555-555555555555","quantity_milli":1000}]'::jsonb,
    4000);
   raise exception 'Closed posting gate permitted a cash sale';
 exception when sqlstate '55000' then null;
 end;
 if exists (select 1 from private.web_pos_sales) then
   raise exception 'Closed gate persisted a sale';
 end if;
end $$;

-- Enabled ONLY in this disposable test database.
update private.web_pos_posting_controls
 set cash_posting_enabled=true,enabled_by=
 '11111111-1111-4111-8111-111111111111',enabled_at=now()
 where business_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
declare
 posted record;
 repeated record;
 sale_count bigint;
begin
 select * into posted from public.post_web_pos_cash_sale(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '77777777-7777-4777-8777-777777777777',
  '[{"product_id":"55555555-5555-4555-8555-555555555555","quantity_milli":1000}]'::jsonb,
  4000);
 if posted.total_ugx <> 4000 or posted.replayed then
   raise exception 'Unexpected initial sale result';
 end if;
 select * into repeated from public.post_web_pos_cash_sale(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '77777777-7777-4777-8777-777777777777',
  '[{"product_id":"55555555-5555-4555-8555-555555555555","quantity_milli":1000}]'::jsonb,
  4000);
 if repeated.sale_id<>posted.sale_id or not repeated.replayed then
   raise exception 'Same-key retry created a new sale';
 end if;
 select count(*) into sale_count from private.web_pos_sales
  where business_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 if sale_count<>1 then raise exception 'Retry duplicated a cash sale'; end if;
 if (select count(*) from private.web_pos_sale_lines where sale_id=posted.sale_id)<>1
  or (select count(*) from private.web_pos_payments where sale_id=posted.sale_id)<>1
  or (select count(*) from private.web_pos_stock_holds where sale_id=posted.sale_id)<>1
  or (select count(*) from private.web_pos_reconciliation_outbox where sale_id=posted.sale_id)<>1
 then raise exception 'Atomic cash sale did not persist all records'; end if;
 begin
   perform * from public.post_web_pos_cash_sale(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '77777777-7777-4777-8777-777777777777',
    '[{"product_id":"55555555-5555-4555-8555-555555555555","quantity_milli":500}]'::jsonb,
    2000);
   raise exception 'Altered idempotency request incorrectly accepted';
 exception when unique_violation then null;
 end;
 begin
   perform * from public.post_web_pos_cash_sale(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '88888888-8888-4888-8888-888888888888',
    '[{"product_id":"55555555-5555-4555-8555-555555555555","quantity_milli":3000}]'::jsonb,
    12000);
   raise exception 'Insufficient hosted stock incorrectly accepted';
 exception when check_violation then null;
 end;
 begin
   perform * from public.post_web_pos_cash_sale(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '99999999-9999-4999-8999-999999999999',
    '[{"product_id":"66666666-6666-4666-8666-666666666666","quantity_milli":1000}]'::jsonb,
    5000);
   raise exception 'Cross-business sale incorrectly accepted';
 exception when insufficient_privilege then null;
 end;
end $$;

-- Owner A can only retrieve business A's staged event.
do $$
declare n integer;
begin
 select count(*) into n from public.list_pending_web_pos_sales(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
 '33333333-3333-4333-8333-333333333333',25);
 if n<>1 then raise exception 'Owner A inbox scope mismatch: %',n; end if;
 begin
 perform * from public.list_pending_web_pos_sales(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-b',
 '44444444-4444-4444-8444-444444444444',25);
 raise exception 'Cross-device inbox was readable';
 exception when insufficient_privilege then null;
 end;
end $$;

-- ACK is immutable and repeatable; release still requires exact desktop
-- replay movement, so the first reconcile must be false.
do $$
declare event_uuid uuid;
result_uuid uuid;
is_ready boolean;
begin
 select id into event_uuid from private.web_pos_reconciliation_outbox limit 1;
 select public.ack_applied_web_pos_sale(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
   '33333333-3333-4333-8333-333333333333',
   event_uuid,91,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') into result_uuid;
 if result_uuid<>event_uuid then raise exception 'Unexpected ACK'; end if;
 perform public.ack_applied_web_pos_sale(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
   '33333333-3333-4333-8333-333333333333',
   event_uuid,91,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
 select public.reconcile_web_pos_stock_holds(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
   '33333333-3333-4333-8333-333333333333',event_uuid) into is_ready;
 if is_ready then
   raise exception 'Hold released without desktop stock evidence';
 end if;
 if (select count(*) from private.web_pos_stock_holds where state='pending')<>1 then
   raise exception 'Pending hold released prematurely';
 end if;
end $$;
