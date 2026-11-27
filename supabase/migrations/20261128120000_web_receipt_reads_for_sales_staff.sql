-- Sales staff (owner, manager, cashier) read the desktop receipt of one sale on
-- the web, as on the desktop (pos.view_sales). Mirror tables stay owner-only;
-- this returns only the receipt, the receipt settings and the business identity.

create function public.get_web_receipt(target_business_id uuid, target_sale_id bigint)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); permission public.business_role;
  receipts int; receipt record; profile jsonb; settings jsonb;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select m.role into permission from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active;
  if permission is null or permission not in ('owner','manager','cashier') then
    raise exception 'Missing permission: pos.view_sales' using errcode='42501';
  end if;
  select count(*) into receipts from public.desktop_business_records r
    where r.business_id=target_business_id and r.entity_type='receipt_snapshots'
      and r.local_record_id=target_sale_id;
  if receipts = 0 then
    raise exception 'Sale not found' using errcode='P0002';
  elsif receipts > 1 then
    raise exception 'Receipt is ambiguous across linked desktops' using errcode='21000';
  end if;
  select r.local_business_public_id as source, r.record->'receipt_json' as receipt_json into receipt
    from public.desktop_business_records r
   where r.business_id=target_business_id and r.entity_type='receipt_snapshots'
     and r.local_record_id=target_sale_id;
  -- Only the fields a receipt shows; never owner contact details beyond them.
  select jsonb_build_object('id',r.local_record_id,
      'business_name',r.record->'business_name','trading_name',r.record->'trading_name',
      'phone',r.record->'phone','email',r.record->'email','tin',r.record->'tin',
      'address',r.record->'address','city',r.record->'city','country',r.record->'country',
      'currency',r.record->'currency','timezone',r.record->'timezone')
    into profile from public.desktop_business_records r
   where r.business_id=target_business_id and r.local_business_public_id=receipt.source
     and r.entity_type='business_profiles' order by r.local_record_id limit 1;
  select r.record into settings from public.desktop_business_records r
   where r.business_id=target_business_id and r.local_business_public_id=receipt.source
     and r.entity_type='receipt_settings' order by r.local_record_id limit 1;
  return jsonb_build_object('source',receipt.source,'receipt',receipt.receipt_json,
    'businessProfile',profile,'receiptSettings',settings);
end $$;
revoke all on function public.get_web_receipt(uuid,bigint) from public,anon,authenticated,service_role;
grant execute on function public.get_web_receipt(uuid,bigint) to authenticated;
