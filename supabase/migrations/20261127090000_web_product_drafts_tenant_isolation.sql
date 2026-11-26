-- SECURITY: the web_product_drafts policies from 20261114170000 compared
-- "m.business_id=business_id" inside a subquery on business_memberships.
-- The unqualified business_id resolved to m.business_id, so the check became
-- m.business_id=m.business_id (always true): an owner or manager of ANY
-- business could insert, read, update or delete their own drafts in ANY
-- other business. Recreate every policy with the outer table qualified.
drop policy if exists web_product_drafts_select on public.web_product_drafts;
drop policy if exists web_product_drafts_insert on public.web_product_drafts;
drop policy if exists web_product_drafts_update on public.web_product_drafts;
drop policy if exists web_product_drafts_delete on public.web_product_drafts;

create policy web_product_drafts_select on public.web_product_drafts
  for select to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid())
        and m.business_id=web_product_drafts.business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_insert on public.web_product_drafts
  for insert to authenticated with check (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid())
        and m.business_id=web_product_drafts.business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_update on public.web_product_drafts
  for update to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid())
        and m.business_id=web_product_drafts.business_id
        and m.active and m.role in ('owner','manager')
    )
  ) with check (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid())
        and m.business_id=web_product_drafts.business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_delete on public.web_product_drafts
  for delete to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid())
        and m.business_id=web_product_drafts.business_id
        and m.active and m.role in ('owner','manager')
    )
  );
