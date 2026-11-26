-- Recovery support for the desktop business mirror. finalize_desktop_business_snapshot
-- refuses a generation that is not newer than the committed head (23505). A desktop
-- whose local counters went backwards (restored from an older backup, reinstalled
-- with the same business source) previously retried that generation forever.
-- This read-only function lets the paired desktop learn the committed generation
-- for one of its own entity types so it can continue from committed + 1 and
-- republish its current authoritative rows. It exposes no business records.
create function public.get_desktop_business_mirror_generation(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid,
  entity_type text
) returns bigint language plpgsql stable security definer set search_path='' as $$
declare committed bigint;
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  if entity_type is null or char_length(entity_type) not between 1 and 64 then
    raise exception 'Invalid mirror entity' using errcode='22023';
  end if;
  select h.committed_generation into committed
    from private.desktop_mirror_heads h
   where h.business_id=target_business_id
     and h.source_business_public_id=get_desktop_business_mirror_generation.source_business_public_id
     and h.entity_type=get_desktop_business_mirror_generation.entity_type;
  return coalesce(committed,0);
end $$;
revoke all on function public.get_desktop_business_mirror_generation(uuid,text,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.get_desktop_business_mirror_generation(uuid,text,uuid,text)
  to authenticated;

-- All committed generations for one desktop source, so an idle desktop can
-- detect, in one request, entity types the web holds beyond what this desktop
-- ever acknowledged (e.g. records entered after the backup it was restored from).
create function public.list_desktop_business_mirror_generations(
  target_business_id uuid,
  source_business_public_id text,
  source_device_public_id uuid
) returns table(entity_type text, committed_generation bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_desktop_inventory_source(
    target_business_id,source_business_public_id,source_device_public_id);
  return query
    select h.entity_type,h.committed_generation
      from private.desktop_mirror_heads h
     where h.business_id=target_business_id
       and h.source_business_public_id=list_desktop_business_mirror_generations.source_business_public_id
     order by h.entity_type;
end $$;
revoke all on function public.list_desktop_business_mirror_generations(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.list_desktop_business_mirror_generations(uuid,text,uuid)
  to authenticated;
