-- Product details for the web Products screen.
--
-- AkiliBiz Web shows the desktop Products screen: product type, units, wholesale
-- and minimum prices, stock levels, tracking options and tax class. Desktops
-- (migration 0129) send these as one "details" object with catalogue snapshots
-- and change events. Optional: an older desktop keeps syncing and never clears
-- details a newer desktop already published.

alter table public.desktop_products
  add column details jsonb check (details is null or (jsonb_typeof(details)='object' and octet_length(details::text) <= 4096));

do $migration$
declare
  definition text;
  validation text := $v$      or (prod ? 'tax_inclusive'
        and jsonb_typeof(prod->'tax_inclusive') not in ('boolean','null')) then$v$;
  insert_cols text := $c$      sales_unit,allow_decimal_quantity,tax_inclusive
    ) values($c$;
  insert_vals text := $i$      (prod->>'tax_inclusive')::boolean
    )$i$;
  update_tail text := $u$      tax_inclusive=coalesce(excluded.tax_inclusive,desktop_products.tax_inclusive),$u$;
begin
  select pg_get_functiondef('public.upload_desktop_catalogue(uuid,text,uuid,jsonb,jsonb)'::regprocedure)
    into definition;
  if position(validation in definition)=0 or position(insert_cols in definition)=0
     or position(insert_vals in definition)=0 or position(update_tail in definition)=0 then
    raise exception 'Reviewed upload_desktop_catalogue definition was not found';
  end if;
  definition := replace(definition, validation, $v$      or (prod ? 'tax_inclusive'
        and jsonb_typeof(prod->'tax_inclusive') not in ('boolean','null'))
      or (prod ? 'details' and jsonb_typeof(prod->'details') not in ('object','null'))
      or (jsonb_typeof(prod->'details')='object' and octet_length((prod->'details')::text) > 4096) then$v$);
  definition := replace(definition, insert_cols, $c$      sales_unit,allow_decimal_quantity,tax_inclusive,details
    ) values($c$);
  definition := replace(definition, insert_vals, $i$      (prod->>'tax_inclusive')::boolean,
      case when jsonb_typeof(prod->'details')='object' then prod->'details' end
    )$i$);
  definition := replace(definition, update_tail, $u$      tax_inclusive=coalesce(excluded.tax_inclusive,desktop_products.tax_inclusive),
      details=coalesce(excluded.details,desktop_products.details),$u$);
  execute definition;
end
$migration$;
