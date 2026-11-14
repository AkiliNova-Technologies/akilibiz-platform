-- Read-only cash-sale status for the originating user and selected business.
-- Additive. Does not enable posting or alter any sale, payment, stock hold or outbox.
create function public.get_web_pos_cash_sale_status(
  target_business_id uuid,
  request_id uuid
) returns table (
  sale_id uuid,
  receipt_number text,
  status text,
  total_ugx bigint,
  change_ugx bigint,
  requested_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not exists(
    select 1 from public.business_memberships m
    where m.business_id = target_business_id
      and m.user_id = actor and m.active
      and m.role in ('owner','manager','cashier')
  ) then
    raise exception 'Sales access required' using errcode='42501';
  end if;
  if request_id is null then
    raise exception 'Request ID required' using errcode='22023';
  end if;
  return query
  select s.id,s.receipt_number,s.status,s.total_ugx,
    s.change_ugx,s.created_at
  from private.web_pos_sales s
  where s.business_id = target_business_id
    and s.actor_id = actor
    and s.idempotency_key = request_id
  limit 1;
end
$$;
revoke all on function public.get_web_pos_cash_sale_status(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.get_web_pos_cash_sale_status(uuid,uuid)
  to authenticated;
