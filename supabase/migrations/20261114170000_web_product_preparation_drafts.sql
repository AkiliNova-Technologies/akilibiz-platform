-- Non-authoritative web product preparation drafts.
-- Does not change desktop products, stock, tax, financial records or sync queues.
create table public.web_product_drafts (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  sku text not null check (char_length(btrim(sku)) between 1 and 160),
  category_id uuid not null,
  barcode text check (barcode is null or char_length(barcode)<=160),
  brand text check (brand is null or char_length(brand)<=200),
  description text check (description is null or char_length(description)<=3000),
  stock_unit text not null check (char_length(btrim(stock_unit)) between 1 and 40),
  cost_price_ugx bigint not null check (cost_price_ugx>=0),
  selling_price_ugx bigint not null check (selling_price_ugx>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,id),
  foreign key (business_id,category_id)
    references public.desktop_categories(business_id,id) on delete restrict
);
create index web_product_drafts_owner_list
  on public.web_product_drafts(business_id,created_by,updated_at desc,id);
alter table public.web_product_drafts enable row level security;
alter table public.web_product_drafts force row level security;
revoke all on public.web_product_drafts from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.web_product_drafts to authenticated;
create policy web_product_drafts_select on public.web_product_drafts
  for select to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid()) and m.business_id=business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_insert on public.web_product_drafts
  for insert to authenticated with check (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid()) and m.business_id=business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_update on public.web_product_drafts
  for update to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid()) and m.business_id=business_id
        and m.active and m.role in ('owner','manager')
    )
  ) with check (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid()) and m.business_id=business_id
        and m.active and m.role in ('owner','manager')
    )
  );
create policy web_product_drafts_delete on public.web_product_drafts
  for delete to authenticated using (
    created_by=(select auth.uid()) and exists (
      select 1 from public.business_memberships m
      where m.user_id=(select auth.uid()) and m.business_id=business_id
        and m.active and m.role in ('owner','manager')
    )
  );
-- Prevent changing author and tenant even when an update RLS check passes.
create function private.protect_web_product_draft_identity()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.business_id is distinct from old.business_id or
     new.created_by is distinct from old.created_by or
     new.id is distinct from old.id then
    raise exception 'Draft identity cannot be changed' using errcode='42501';
  end if;
  new.updated_at=now();
  return new;
end $$;
create trigger protect_web_product_draft_identity
  before update on public.web_product_drafts
  for each row execute function private.protect_web_product_draft_identity();
