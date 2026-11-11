\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare
  version_at timestamptz;
  command uuid;
  results integer;
  receipt uuid := '99999999-9999-4999-8999-999999999999';
begin
  select updated_at into version_at from public.desktop_customers
    where id='55555555-5555-4555-8555-555555555555';
  -- Default off: cannot enqueue a command on fresh business.
  begin
    perform public.request_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer',
      '55555555-5555-4555-8555-555555555555',version_at,
      '{"name":"Updated Customer"}');
    raise exception 'Default-off gate incorrectly accepted a command';
  exception when sqlstate '55000' then null;
  end;
  if exists(select 1 from private.desktop_inbound_commands) then
    raise exception 'Disabled pilot created a command';
  end if;
  insert into private.desktop_inbound_controls(
    business_id,contacts_enabled,enabled_at,enabled_by)
  values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,now(),
    '11111111-1111-4111-8111-111111111111');
  command := public.request_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer',
      '55555555-5555-4555-8555-555555555555',version_at,
      '{"name":"Updated Customer"}');
  if command is null then raise exception 'Command ID missing'; end if;
  if (select base_record->>'name' from private.desktop_inbound_commands
      where id=command)<>'Original Customer' then
    raise exception 'Queued update lost the source baseline';
  end if;
  if (select state from public.desktop_contact_update_status(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',command))<>'pending' then
    raise exception 'Owner command status not pending';
  end if;
  if (select name from public.desktop_customers where
       id='55555555-5555-4555-8555-555555555555')<>'Original Customer' then
    raise exception 'Enqueue illegally changed source mirror';
  end if;
  -- No concurrent second edit on a pending source record.
  begin
    perform public.request_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer',
      '55555555-5555-4555-8555-555555555555',version_at,
      '{"name":"Another Customer"}');
    raise exception 'Pending record accepted second edit';
  exception when unique_violation then null;
  end;
  begin
    perform public.request_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer',
      '55555555-5555-4555-8555-555555555555',
      version_at - interval '1 second','{"name":"Stale"}');
    raise exception 'Stale version accepted';
  exception when sqlstate '40001' then null;
  end;
  begin
    perform public.request_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer',
      '55555555-5555-4555-8555-555555555555',version_at,
      '{"loyalty_points":999999}');
    raise exception 'Financial field accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.request_desktop_contact_update(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','supplier',
      '66666666-6666-4666-8666-666666666666',version_at,
      '{"name":"Cross-business"}');
    raise exception 'Owner A wrote to B';
  exception when insufficient_privilege then null;
  end;
  select count(*) into results from public.list_pending_desktop_contact_updates(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
    '33333333-3333-4333-8333-333333333333',50);
  if results<>1 then raise exception 'Expected one pending inbound command, got %',results; end if;
  begin
    perform * from public.list_pending_desktop_contact_updates(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-b',
      '44444444-4444-4444-8444-444444444444',50);
    raise exception 'Cross-device command list permitted';
  exception when insufficient_privilege then null;
  end;
  if public.ack_desktop_contact_update(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
    '33333333-3333-4333-8333-333333333333',
    command,receipt,'applied')<>'applied' then
    raise exception 'ACK failed';
  end if;
  if public.ack_desktop_contact_update(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
    '33333333-3333-4333-8333-333333333333',
    command,receipt,'applied')<>'applied' then
    raise exception 'ACK replay failed';
  end if;
  if (select state from public.desktop_contact_update_status(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',command))<>'applied' then
    raise exception 'Owner command status not applied';
  end if;
  if (select count(*) from private.desktop_inbound_receipts)<>1 or
     (select count(*) from public.list_pending_desktop_contact_updates(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',50))<>0 then
    raise exception 'ACK did not close queue exactly once';
  end if;
  begin
    perform public.ack_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      command,gen_random_uuid(),'applied');
    raise exception 'ACK accepted altered receipt';
  exception when unique_violation then null;
  end;
  if (select name from public.desktop_customers where
       id='55555555-5555-4555-8555-555555555555')<>'Original Customer' then
    raise exception 'ACK illegally changed source mirror';
  end if;
  update private.desktop_devices set revoked_at=now()
     where device_public_id='33333333-3333-4333-8333-333333333333';
  begin
    perform * from public.list_pending_desktop_contact_updates(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',50);
    raise exception 'Revoked device read commands';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ack_desktop_contact_update(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','source-a',
      '33333333-3333-4333-8333-333333333333',
      command,receipt,'applied');
    raise exception 'Revoked device ACK accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
