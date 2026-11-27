-- The desktop POS marks products whose VAT treatment is taxable. On the web the
-- desktop-published POS tax profile holds that in private tables. Expose only
-- whether each product is taxable (no rates or registration details) to the
-- business's sales staff, so the web POS can show the same badge.
create function public.list_web_pos_product_tax_flags(target_business_id uuid)
returns table(product_id uuid, taxable boolean)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); permission public.business_role;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select m.role into permission from public.business_memberships m
    where m.business_id=target_business_id and m.user_id=actor and m.active;
  if permission is null or permission not in ('owner','manager','cashier') then
    raise exception 'Business sales permission required' using errcode='42501';
  end if;
  return query
    select r.product_id, coalesce(r.rate_basis_points, case when r.taxable then 1 else 0 end) > 0
      from private.web_pos_product_tax_rules r
     where r.business_id=target_business_id;
end $$;
revoke all on function public.list_web_pos_product_tax_flags(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.list_web_pos_product_tax_flags(uuid) to authenticated;
