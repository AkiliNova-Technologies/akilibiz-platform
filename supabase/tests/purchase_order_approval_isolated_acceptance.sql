\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

insert into public.web_purchase_order_drafts(
 id,business_id,created_by,supplier_id,source_business_public_id,
 po_number,order_date,expected_delivery,notes,lines) values(
 'aaaaaaaa-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '55555555-5555-4555-8555-555555555555','desktop-a','PO-WEB-001',
 '2026-11-16','2026-11-20','Disposable qualification',
 '[{"product_id":"99999999-9999-4999-8999-999999999999","quantity_milli":1500,"unit_price_ugx":4000}]'
);
reset role;
insert into private.desktop_purchase_order_request_controls values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
set local role authenticated;

select public.request_desktop_purchase_order_review(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-1111-4111-8111-111111111111',
 'aaaaaaaa-2222-4222-8222-222222222222');

do $$ declare replay uuid; command uuid; begin
 select command_id into command
  from public.list_desktop_purchase_order_review_statuses(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') limit 1;
 replay:=public.request_desktop_purchase_order_review(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-1111-4111-8111-111111111111',
  'aaaaaaaa-2222-4222-8222-222222222222');
 if replay<>command then raise exception 'request replay changed identity'; end if;
 begin
  perform public.request_desktop_purchase_order_review(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-1111-4111-8111-111111111111',gen_random_uuid());
  raise exception 'changed replay accepted';
 exception when unique_violation then null; end;
end $$;

reset role;
do $$ declare payload jsonb; begin
 select c.payload into payload from private.desktop_purchase_order_requests c
  where c.draft_id='aaaaaaaa-1111-4111-8111-111111111111';
 if payload#>>'{lines,0,product_id}'<>'10'
  or payload->>'supplier_public_id'<>'77777777-7777-4777-8777-777777777777'
 then raise exception 'desktop identities were not server-snapshotted'; end if;
end $$;
set local role authenticated;

do $$ declare command uuid; begin
 select command_id into command
  from public.list_desktop_purchase_order_review_statuses(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') limit 1;
 if not public.verify_desktop_purchase_order_pending(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
  '33333333-3333-4333-8333-333333333333',command)
 then raise exception 'pending request not authorized'; end if;
end $$;

do $$ declare command uuid; begin
 select command_id into command
  from public.list_desktop_purchase_order_review_statuses(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') limit 1;
 if public.ack_desktop_purchase_order(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
  '33333333-3333-4333-8333-333333333333',command,
  'aaaaaaaa-3333-4333-8333-333333333333',91,
  'aaaaaaaa-4444-4444-8444-444444444444')<>'applied'
 then raise exception 'ACK not applied'; end if;
 if public.ack_desktop_purchase_order(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
  '33333333-3333-4333-8333-333333333333',command,
  'aaaaaaaa-3333-4333-8333-333333333333',91,
  'aaaaaaaa-4444-4444-8444-444444444444')<>'applied'
 then raise exception 'identical ACK replay failed'; end if;
 begin
  perform public.ack_desktop_purchase_order(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
   '33333333-3333-4333-8333-333333333333',command,
   gen_random_uuid(),91,'aaaaaaaa-4444-4444-8444-444444444444');
  raise exception 'conflicting ACK accepted';
 exception when unique_violation then null; end;
 if public.verify_desktop_purchase_order_pending(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
  '33333333-3333-4333-8333-333333333333',command)
 then raise exception 'applied request still pending'; end if;
end $$;

-- Revocation is checked on every desktop verification and ACK call.
reset role;
update private.desktop_devices set revoked_at=now()
 where device_public_id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
do $$ declare command uuid; begin
 select command_id into command
  from public.list_desktop_purchase_order_review_statuses(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') limit 1;
 begin
  perform public.verify_desktop_purchase_order_pending(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','desktop-a',
   '33333333-3333-4333-8333-333333333333',command);
  raise exception 'revoked device accepted';
 exception when insufficient_privilege then null; end;
end $$;

-- Another tenant owner cannot enumerate the request.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 begin
  perform * from public.list_desktop_purchase_order_review_statuses(
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  raise exception 'cross-business status read accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
