-- Hosted staff membership management. Accounts are authenticated individually;
-- knowing a business ID or a business name never grants access.
-- Only active owners can grant, change, or deactivate non-owner memberships.

create function public.list_business_staff(target_business_id uuid)
returns table (user_id uuid, email text, role public.business_role, active boolean)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if (select auth.uid()) is null
     or not private.is_active_business_owner(target_business_id) then
    raise exception 'Not allowed to view business team';
  end if;

  return query
    select membership.user_id, account.email::text, membership.role, membership.active
    from public.business_memberships as membership
    join auth.users as account on account.id = membership.user_id
    where membership.business_id = target_business_id
    order by (membership.role = 'owner') desc, account.email;
end;
$$;

create function public.grant_business_staff(
  target_business_id uuid,
  target_email text,
  target_role public.business_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  if (select auth.uid()) is null
     or not private.is_active_business_owner(target_business_id) then
    raise exception 'Not allowed to manage this business team';
  end if;

  if target_role is null or target_role = 'owner' then
    raise exception 'Only non-owner roles can be granted';
  end if;

  if target_email is null or char_length(btrim(target_email)) < 3 or
     char_length(target_email) > 320 then
    raise exception 'Enter a valid account email';
  end if;

  select account.id into target_user
  from auth.users as account
  where lower(account.email) = lower(btrim(target_email))
  limit 1;

  if target_user is null then
    raise exception 'No existing AkiliBiz user has that email';
  end if;

  if exists (
    select 1 from public.business_memberships
    where business_id = target_business_id and user_id = target_user and role = 'owner'
  ) then
    raise exception 'Owner membership cannot be changed here';
  end if;

  insert into public.business_memberships (business_id, user_id, role, active)
  values (target_business_id, target_user, target_role, true)
  on conflict (business_id, user_id)
  do update set role = excluded.role, active = true, updated_at = now();

  insert into public.audit_events (business_id, actor_id, event_type, entity_type, entity_id, payload)
  values (target_business_id, (select auth.uid()), 'business.member_granted',
          'business_membership', target_user,
          jsonb_build_object('role', target_role::text));
end;
$$;

create function public.deactivate_business_staff(
  target_business_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if (select auth.uid()) is null
     or not private.is_active_business_owner(target_business_id) then
    raise exception 'Not allowed to manage this business team';
  end if;

  update public.business_memberships
  set active = false, updated_at = now()
  where business_id = target_business_id
    and user_id = target_user_id
    and role <> 'owner'
    and active
  returning 1 into changed_count;

  if changed_count is null then
    raise exception 'Only active non-owner members can be deactivated';
  end if;

  insert into public.audit_events (business_id, actor_id, event_type, entity_type, entity_id, payload)
  values (target_business_id, (select auth.uid()), 'business.member_deactivated',
          'business_membership', target_user_id, '{}'::jsonb);
end;
$$;

revoke all on function public.list_business_staff(uuid) from public, anon, service_role;
revoke all on function public.grant_business_staff(uuid, text, public.business_role) from public, anon, service_role;
revoke all on function public.deactivate_business_staff(uuid, uuid) from public, anon, service_role;
grant execute on function public.list_business_staff(uuid) to authenticated;
grant execute on function public.grant_business_staff(uuid, text, public.business_role) to authenticated;
grant execute on function public.deactivate_business_staff(uuid, uuid) to authenticated;
