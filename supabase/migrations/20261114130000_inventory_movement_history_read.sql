-- Read-only inventory movement evidence. This does not post or reconcile stock.
-- All source records originate from validated desktop checkpoint movement receipts.
create function public.list_desktop_inventory_movement_history(
  target_business_id uuid,
  page_offset integer default 0,
  page_limit integer default 50
) returns table(
  movement_id uuid,
  local_product_id bigint,
  local_business_public_id text,
  source_movement_id bigint,
  delta_milli bigint,
  before_milli bigint,
  after_milli bigint,
  movement_type text,
  reason text,
  notes text,
  accepted_at timestamptz,
  total_count bigint
)
language plpgsql security definer set search_path='' as $history$
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.business_memberships b
    where b.business_id=target_business_id and b.user_id=(select auth.uid())
      and b.active
  ) then
    raise exception 'Business membership required' using errcode='42501';
  end if;
  if page_offset is null or page_offset<0 or page_offset>1000000 or
    page_limit is null or page_limit<1 or page_limit>100 then
    raise exception 'Invalid history page' using errcode='22023';
  end if;
  return query
    select r.id,r.local_product_id,r.source_business_public_id,r.source_movement_id,
      r.delta_milli,r.before_milli,r.after_milli,
      nullif(r.payload->>'movement_type',''),
      nullif(r.payload->>'reason',''),
      nullif(r.payload->>'notes',''),
      r.accepted_at,
      count(*) over()
    from private.desktop_inventory_movement_receipts r
    where r.business_id=target_business_id
    order by r.accepted_at desc,r.id desc
    limit page_limit offset page_offset;
end
$history$;
revoke all on function public.list_desktop_inventory_movement_history(uuid,integer,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.list_desktop_inventory_movement_history(uuid,integer,integer)
  to authenticated;
