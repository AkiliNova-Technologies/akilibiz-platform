-- Phase 2C4: recovering a product request must not depend on browser storage.
-- Freeze requested drafts at the database boundary, including direct RLS writes.
-- Additive only; no existing product or stock changes.
create function private.prevent_requested_product_draft_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
declare draft_business uuid;
declare draft_id uuid;
begin
  draft_business:=old.business_id;
  draft_id:=old.id;
  if exists (
    select 1 from private.desktop_product_create_commands c
    where c.business_id=draft_business and c.draft_id=draft_id
  ) then
    raise exception 'This product draft was already sent for desktop review and cannot be changed or discarded'
      using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $;
revoke all on function private.prevent_requested_product_draft_mutation()
  from public,anon,authenticated,service_role;

create trigger prevent_requested_product_draft_update
before update on public.web_product_drafts
for each row execute function private.prevent_requested_product_draft_mutation();

create trigger prevent_requested_product_draft_delete
before delete on public.web_product_drafts
for each row execute function private.prevent_requested_product_draft_mutation();

-- Used for one owner-scoped lookup or a bulk listing of that owner's requests.
-- Unlike a cached browser state, this survives device/browser changes.
create function public.list_desktop_product_create_statuses(target_business_id uuid)
returns table(
  command_id uuid,
  draft_id uuid,
  state text,
  requested_at timestamptz
) language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_business_owner(target_business_id) then
    raise exception 'Owner access required' using errcode='42501';
  end if;
  return query
    select c.id,c.draft_id,
      case when c.state='applied' and exists (
        select 1 from public.desktop_products p
        where p.business_id=c.business_id
          and p.local_business_public_id=c.source_business_public_id
          and p.local_product_id=c.local_product_id
          and p.category_id=c.category_id
          and p.sku=(c.payload->>'sku')
      ) then 'published' else c.state end as state,
      c.created_at
    from private.desktop_product_create_commands c
    where c.business_id=target_business_id
      and c.requested_by=(select auth.uid())
    order by c.created_at desc,c.id desc
    limit 100;
end $$;
revoke all on function public.list_desktop_product_create_statuses(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.list_desktop_product_create_statuses(uuid)
  to authenticated;
