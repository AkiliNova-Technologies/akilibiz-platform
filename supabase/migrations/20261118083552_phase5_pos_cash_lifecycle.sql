-- Phase 5 cash lifecycle. Additive and disabled by the existing posting gate.
-- This migration does not activate any business or production transaction path.

alter table private.web_pos_sales
  add column desktop_receipt_number text;
alter table private.web_pos_desktop_apply_receipts
  add column local_sale_number text;

-- The original function deliberately required exact tender while desktop
-- cash-change parity was unqualified. Replace only that guarded clause; abort
-- migration if the expected reviewed definition is not present.
do $migration$
declare
  definition text;
  exact_guard text := $guard$
  -- Until the desktop consumer supports cash tender/change parity,
  -- only exact-tender cash sales can enter the hosted reconciliation outbox.
  -- Reject at posting time rather than producing permanently blocked events.
  if cash_received_ugx::numeric <> sum_total then
    raise exception 'Exact cash tender is required for web sales'
      using errcode='23514';
  end if;
$guard$;
begin
  select pg_get_functiondef(
    'public.post_web_pos_cash_sale(uuid,uuid,jsonb,bigint)'::regprocedure
  ) into definition;
  if position(exact_guard in definition) = 0 then
    raise exception 'Reviewed exact-tender guard was not found';
  end if;
  definition := replace(definition, exact_guard, $replacement$
  if cash_received_ugx::numeric < sum_total then
    raise exception 'Cash received is less than amount payable'
      using errcode='23514';
  end if;
$replacement$);
  execute definition;
end
$migration$;

create function public.ack_applied_web_pos_sale_v2(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  target_event_id uuid,
  local_sale_id bigint,
  authoritative_sale_number text,
  ack_request_id uuid
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  confirmed uuid;
  prior text;
  target_sale uuid;
begin
  if authoritative_sale_number is null or btrim(authoritative_sale_number)=''
     or length(authoritative_sale_number)>120 then
    raise exception 'Invalid authoritative sale number' using errcode='22023';
  end if;
  confirmed := public.ack_applied_web_pos_sale(
    target_business_id,source_business_public_id,source_device_public_id,
    target_event_id,local_sale_id,ack_request_id
  );
  select r.local_sale_number into prior
  from private.web_pos_desktop_apply_receipts r
  where r.event_id=target_event_id;
  if prior is not null and prior<>btrim(authoritative_sale_number) then
    raise exception 'Conflicting authoritative sale number' using errcode='23505';
  end if;
  update private.web_pos_desktop_apply_receipts
    set local_sale_number=btrim(authoritative_sale_number)
    where event_id=target_event_id
      and private.web_pos_desktop_apply_receipts.local_sale_number is null;
  select o.sale_id into target_sale
  from private.web_pos_reconciliation_outbox o
  where o.id=target_event_id and o.business_id=target_business_id;
  update private.web_pos_sales
    set desktop_receipt_number=btrim(authoritative_sale_number)
    where business_id=target_business_id and id=target_sale
      and (desktop_receipt_number is null
           or desktop_receipt_number=btrim(authoritative_sale_number));
  if not found then
    raise exception 'Conflicting finalized receipt' using errcode='23505';
  end if;
  return confirmed;
end;
$$;
revoke all on function public.ack_applied_web_pos_sale_v2(
  uuid,text,uuid,uuid,bigint,text,uuid
) from public,anon,authenticated,service_role;
grant execute on function public.ack_applied_web_pos_sale_v2(
  uuid,text,uuid,uuid,bigint,text,uuid
) to authenticated;

create or replace function public.get_web_pos_cash_sale_status(
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
language plpgsql security definer set search_path=''
as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not exists(
    select 1 from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active
      and m.role in ('owner','manager','cashier')
  ) then
    raise exception 'Sales access required' using errcode='42501';
  end if;
  if request_id is null then
    raise exception 'Request ID required' using errcode='22023';
  end if;
  return query
  select s.id,
    case when s.status in ('desktop_applied','reconciled')
      then s.desktop_receipt_number else null end,
    s.status,s.total_ugx,s.change_ugx,s.created_at
  from private.web_pos_sales s
  where s.business_id=target_business_id and s.actor_id=actor
    and s.idempotency_key=request_id
  limit 1;
end;
$$;
revoke all on function public.get_web_pos_cash_sale_status(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.get_web_pos_cash_sale_status(uuid,uuid)
  to authenticated;
