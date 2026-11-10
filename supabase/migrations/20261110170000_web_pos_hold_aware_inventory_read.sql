-- Optional read-only POS inventory projection including pending web-sale
-- stock holds. Separate from the Phase 1G-qualified desktop effective stock
-- RPC; the existing synchronization and posting paths are unchanged.
create function public.list_web_pos_sellable_inventory(target_business_id uuid)
returns table (
  id uuid,product_id uuid,local_business_public_id text,local_product_id bigint,
  on_hand_milli bigint,reserved_milli bigint,damaged_milli bigint,
  minimum_milli bigint,maximum_milli bigint,is_current boolean,
  snapshot_at timestamptz,ledger_checkpoint_id uuid,ledger_movement_id bigint
)
language plpgsql security definer set search_path='' stable
as $$
begin
  if (select auth.uid()) is null
     or not exists (
       select 1 from public.business_memberships m
       where m.business_id=target_business_id
         and m.user_id=(select auth.uid()) and m.active
     ) then
    raise exception 'Active business membership required' using errcode='42501';
  end if;
  return query
  select i.id,i.product_id,i.local_business_public_id,i.local_product_id,
    i.on_hand_milli,
    case
      when i.reserved_milli is null then null::bigint
      when i.reserved_milli::numeric+coalesce(h.held_milli,0) > 9223372036854775807::numeric
        then null::bigint
      else (i.reserved_milli::numeric+coalesce(h.held_milli,0))::bigint
    end,
    i.damaged_milli,i.minimum_milli,i.maximum_milli,i.is_current,
    i.snapshot_at,i.ledger_checkpoint_id,i.ledger_movement_id
  from public.list_desktop_effective_inventory(target_business_id) i
  left join (
    select p.product_id,sum(p.quantity_milli)::numeric as held_milli
    from private.web_pos_stock_holds p
    where p.business_id=target_business_id and p.state<>'released'
    group by p.product_id
  ) h on h.product_id=i.product_id
  order by i.local_product_id;
end;
$$;
revoke all on function public.list_web_pos_sellable_inventory(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.list_web_pos_sellable_inventory(uuid)
 to authenticated;
