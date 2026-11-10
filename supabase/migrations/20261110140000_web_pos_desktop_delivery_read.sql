-- Read-only, owner/device-authorized desktop web-sale inbox feed.
-- This does not acknowledge, advance or delete an outbox event.
-- The posting feature gate remains disabled; it is NOT changed here.
--
-- The desktop must persist and verify each received event before attempting
-- any financial / inventory posting. No reconciliation ACK API is exposed.

create or replace function public.list_pending_web_pos_sales(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  max_events integer default 25
)
returns table (
  event_id uuid,
  sale_id uuid,
  event_type text,
  receipt_number text,
  total_ugx bigint,
  created_at timestamptz,
  event_payload jsonb
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or target_business_id is null
     or source_device_public_id is null
     or source_business_public_id is null
     or length(btrim(source_business_public_id)) = 0
     or max_events is null or max_events not between 1 and 100 then
    raise exception 'Invalid web sale inbox request' using errcode='22023';
  end if;

  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Current business owner required' using errcode='42501';
  end if;
  if not exists (
    select 1 from private.desktop_devices d
    where d.business_id=target_business_id
      and d.local_business_public_id=source_business_public_id
      and d.device_public_id=source_device_public_id
      and d.paired_by=actor
      and d.revoked_at is null
  ) then
    raise exception 'Unrecognized or revoked desktop source' using errcode='42501';
  end if;

  -- Do not disclose sale lines belonging to a different source, including
  -- multi-source web sales. Those require a separate coordination protocol.
  return query
    select o.id, s.id, o.event_type, s.receipt_number, s.total_ugx,
      o.created_at, o.event_payload
    from private.web_pos_reconciliation_outbox o
    join private.web_pos_sales s
      on s.business_id=o.business_id and s.id=o.sale_id
    where o.business_id=target_business_id
      and o.status in ('pending','delivering')
      and exists (
        select 1 from private.web_pos_sale_lines l
        join public.desktop_products p
          on p.business_id=l.business_id and p.id=l.product_id
        where l.business_id=o.business_id and l.sale_id=o.sale_id
          and p.local_business_public_id=source_business_public_id
      )
      and not exists (
        select 1 from private.web_pos_sale_lines l
        left join public.desktop_products p
          on p.business_id=l.business_id and p.id=l.product_id
        where l.business_id=o.business_id and l.sale_id=o.sale_id
          and (p.id is null or
               p.local_business_public_id<>source_business_public_id)
      )
    order by o.created_at, o.id
    limit max_events;
end
$$;

revoke all on function public.list_pending_web_pos_sales(uuid,text,uuid,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.list_pending_web_pos_sales(uuid,text,uuid,integer)
  to authenticated;
