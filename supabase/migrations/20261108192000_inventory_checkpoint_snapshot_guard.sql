-- Phase 1A: block legacy snapshot writes after a verified checkpoint.
-- This migration is additive and intentionally leaves public replay RPCs off.
-- The existing snapshot RPC takes the same per-source advisory transaction lock
-- as checkpoint staging. This row-level trigger also locks to protect against
-- direct writes that might otherwise race with checkpoint creation.

create or replace function private.guard_checkpointed_inventory_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_business uuid;
  incoming_source text;
  old_checkpoint_exists boolean;
  new_checkpoint_exists boolean;
begin
  if tg_op = 'DELETE' then
    incoming_business := old.business_id;
    incoming_source := old.local_business_public_id;
  else
    incoming_business := new.business_id;
    incoming_source := new.local_business_public_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'akilibiz-stock:' || incoming_business::text || ':' || incoming_source, 0
  ));

  -- Scope this protection to the logical desktop source, not merely one
  -- device; one paired device may not replace another's checkpointed baseline.
  select exists(
    select 1 from private.desktop_inventory_checkpoints c
    where c.business_id=incoming_business
      and c.source_business_public_id=incoming_source
  ) into new_checkpoint_exists;

  if tg_op = 'UPDATE' and (
    old.business_id is distinct from new.business_id or
    old.local_business_public_id is distinct from new.local_business_public_id
  ) then
    perform pg_advisory_xact_lock(hashtextextended(
      'akilibiz-stock:' || old.business_id::text || ':' || old.local_business_public_id, 0
    ));
    select exists(
      select 1 from private.desktop_inventory_checkpoints c
      where c.business_id=old.business_id
        and c.source_business_public_id=old.local_business_public_id
    ) into old_checkpoint_exists;
  end if;

  if new_checkpoint_exists or coalesce(old_checkpoint_exists,false) then
    raise exception 'Inventory checkpoint established: legacy stock snapshots are disabled for this source'
      using errcode='23514';
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.guard_checkpointed_inventory_position()
from public, anon, authenticated;

create trigger desktop_inventory_checkpoint_write_guard
before insert or update or delete on public.desktop_inventory_positions
for each row execute function private.guard_checkpointed_inventory_position();

-- No blanket grants. Do not expose staging helpers or apply stock movements
-- until checkpoint provenance and all integration gates have passed.
