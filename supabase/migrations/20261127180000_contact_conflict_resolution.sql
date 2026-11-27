-- Owner resolution of web-to-desktop contact edit conflicts.
--
-- A conflict means the desktop changed the contact after the web edit was based
-- on it, so the desktop kept its value. Until now the owner could only see this
-- inside the edit dialog while it stayed open; afterwards the conflict was
-- invisible and could not be acted on. This adds:
--   * a list of the owner's recent contact change requests with their current
--     contact values, so conflicts can be reviewed at any time;
--   * "keep the desktop version" (record the decision, send nothing);
--   * "apply my change to the current version" (atomically re-queue the
--     owner's intended values against the latest synchronized version and link
--     the new request to the conflict).
-- The desktop remains authoritative: nothing here changes a desktop record
-- directly, and a re-queued edit still needs the desktop to apply it.

alter table private.desktop_inbound_commands
  add column resolution text
    check (resolution in ('kept_desktop','reapplied','already_current')),
  add column resolved_at timestamptz,
  add column resolved_by uuid,
  add column replacement_command_id uuid references private.desktop_inbound_commands(id),
  add constraint desktop_inbound_resolution_consistency check (
    (resolution is null) = (resolved_at is null)
    and (resolution is null or (state='conflict' and resolved_by is not null))
    and ((resolution='reapplied') = (replacement_command_id is not null))
  );

-- Current synchronized values of one contact, in the edit field shape.
create function private.current_desktop_contact(
  target_business_id uuid, source_business text, entity text, source_id uuid
) returns table(contact_id uuid, contact_name text, updated_at timestamptz, record jsonb)
language sql stable set search_path='' as $$
  select c.id, c.name, c.updated_at,
    jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone,'address',c.address)
  from public.desktop_customers c
  where entity='customer' and c.business_id=target_business_id
    and c.local_business_public_id=source_business and c.source_public_id=source_id and c.is_active
  union all
  select s.id, s.name, s.updated_at,
    jsonb_build_object('name',s.name,'contact_person',s.contact_person,'email',s.email,
      'phone',s.phone,'address',s.address,'payment_terms',s.payment_terms)
  from public.desktop_suppliers s
  where entity='supplier' and s.business_id=target_business_id
    and s.local_business_public_id=source_business and s.source_public_id=source_id and s.is_active
$$;
revoke all on function private.current_desktop_contact(uuid,text,text,uuid)
  from public,anon,authenticated,service_role;

create function public.list_desktop_contact_change_requests(target_business_id uuid)
returns table(
  command_id uuid, entity_type text, contact_id uuid, contact_name text, state text,
  requested_at timestamptz, applied_at timestamptz, conflict_reason text,
  requested_changes jsonb, base_record jsonb, current_record jsonb,
  resolution text, resolved_at timestamptz, replacement_command_id uuid
) language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  return query
    select c.id, c.entity_type, cur.contact_id,
      coalesce(cur.contact_name, c.base_record->>'name'), c.state,
      c.requested_at, c.applied_at, c.conflict_reason, c.changes, c.base_record,
      cur.record, c.resolution, c.resolved_at, c.replacement_command_id
    from private.desktop_inbound_commands c
    left join lateral private.current_desktop_contact(
      c.business_id, c.source_business_public_id, c.entity_type, c.source_public_id) cur on true
    where c.business_id=target_business_id and c.requested_by=(select auth.uid())
    order by c.requested_at desc, c.id desc
    limit 100;
end $$;
revoke all on function public.list_desktop_contact_change_requests(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.list_desktop_contact_change_requests(uuid) to authenticated;

-- Keep the desktop's value. Idempotent; refuses a conflict already re-applied.
create function public.keep_desktop_contact_version(target_business_id uuid, target_command_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); c private.desktop_inbound_commands%rowtype;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  select * into c from private.desktop_inbound_commands x
   where x.id=target_command_id and x.business_id=target_business_id and x.requested_by=actor
   for update;
  if not found then
    raise exception 'Contact change request not found' using errcode='42501';
  end if;
  if c.state<>'conflict' then
    raise exception 'Only conflicting changes can be resolved' using errcode='55000';
  end if;
  if c.resolution='kept_desktop' then return c.resolution; end if;
  if c.resolution is not null then
    raise exception 'This conflict was already resolved' using errcode='PT409';
  end if;
  update private.desktop_inbound_commands
     set resolution='kept_desktop', resolved_at=now(), resolved_by=actor
   where id=c.id;
  return 'kept_desktop';
end $$;
revoke all on function public.keep_desktop_contact_version(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.keep_desktop_contact_version(uuid,uuid) to authenticated;

-- Re-queue the owner's intended values against the current synchronized
-- version. Only fields that still differ are sent; if none differ the conflict
-- is closed as already current. Returns the new request ID, or null when
-- nothing needed sending. Idempotent for an already re-applied conflict.
create function public.reapply_desktop_contact_change(target_business_id uuid, target_command_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  c private.desktop_inbound_commands%rowtype;
  cur record;
  remaining jsonb := '{}'::jsonb;
  k text;
  new_id uuid;
begin
  if actor is null or not private.is_active_business_owner(target_business_id) then
    raise exception 'Business owner access required' using errcode='42501';
  end if;
  select * into c from private.desktop_inbound_commands x
   where x.id=target_command_id and x.business_id=target_business_id and x.requested_by=actor
   for update;
  if not found then
    raise exception 'Contact change request not found' using errcode='42501';
  end if;
  if c.state<>'conflict' then
    raise exception 'Only conflicting changes can be resolved' using errcode='55000';
  end if;
  if c.resolution='reapplied' then return c.replacement_command_id; end if;
  if c.resolution='already_current' then return null; end if;
  if c.resolution is not null then
    raise exception 'This conflict was already resolved' using errcode='PT409';
  end if;
  select * into cur from private.current_desktop_contact(
    c.business_id, c.source_business_public_id, c.entity_type, c.source_public_id);
  if not found then
    raise exception 'Contact is not active in this business' using errcode='23503';
  end if;
  for k in select jsonb_object_keys(c.changes) loop
    if (c.changes->k) is distinct from (cur.record->k) then
      remaining := remaining || jsonb_build_object(k, c.changes->k);
    end if;
  end loop;
  if remaining = '{}'::jsonb then
    update private.desktop_inbound_commands
       set resolution='already_current', resolved_at=now(), resolved_by=actor
     where id=c.id;
    return null;
  end if;
  -- Same validation, owner, gate, pairing and one-pending-per-contact rules
  -- as any web edit; the base is the current synchronized version.
  new_id := public.request_desktop_contact_update(
    target_business_id, c.entity_type, cur.contact_id, cur.updated_at, remaining);
  update private.desktop_inbound_commands
     set resolution='reapplied', resolved_at=now(), resolved_by=actor,
         replacement_command_id=new_id
   where id=c.id;
  return new_id;
end $$;
revoke all on function public.reapply_desktop_contact_change(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.reapply_desktop_contact_change(uuid,uuid) to authenticated;
