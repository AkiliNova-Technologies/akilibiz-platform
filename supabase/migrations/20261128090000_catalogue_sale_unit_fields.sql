-- Product selling behaviour for the web POS.
--
-- The desktop POS builds its counter and cart from each product's selling unit,
-- whether decimal quantities are allowed, and whether its price includes VAT.
-- The web catalogue only carried the stock unit and price, so the web POS could
-- not offer the same "Sell in" unit, measured quantities or VAT presentation.
-- Desktops now send these three fields with catalogue snapshots and events.
-- They are optional: an older desktop that does not send them keeps syncing and
-- never clears values a newer desktop already published.

alter table public.desktop_products
  add column sales_unit text check (sales_unit is null or char_length(btrim(sales_unit)) between 1 and 40),
  add column allow_decimal_quantity boolean,
  add column tax_inclusive boolean;

do $migration$
declare
  definition text;
  validation text := $v$      or jsonb_typeof(prod->'active') <> 'boolean' then
      raise exception 'Invalid source product' using errcode='22023';
    end if;$v$;
  insert_cols text := $c$      barcode,description,brand,stock_unit,selling_price_ugx,cost_price_ugx,is_active
    ) values($c$;
  insert_vals text := $i$      (prod->>'active')::boolean
    )$i$;
  update_tail text := $u$      cost_price_ugx=excluded.cost_price_ugx,is_active=excluded.is_active,updated_at=now();$u$;
begin
  select pg_get_functiondef('public.upload_desktop_catalogue(uuid,text,uuid,jsonb,jsonb)'::regprocedure)
    into definition;
  if position(validation in definition)=0 or position(insert_cols in definition)=0
     or position(insert_vals in definition)=0 or position(update_tail in definition)=0 then
    raise exception 'Reviewed upload_desktop_catalogue definition was not found';
  end if;
  definition := replace(definition, validation, $v$      or jsonb_typeof(prod->'active') <> 'boolean'
      or (prod ? 'sales_unit' and jsonb_typeof(prod->'sales_unit') <> 'null' and (
        jsonb_typeof(prod->'sales_unit') <> 'string'
        or char_length(btrim(prod->>'sales_unit')) not between 1 and 40))
      or (prod ? 'allow_decimal_quantity'
        and jsonb_typeof(prod->'allow_decimal_quantity') not in ('boolean','null'))
      or (prod ? 'tax_inclusive'
        and jsonb_typeof(prod->'tax_inclusive') not in ('boolean','null')) then
      raise exception 'Invalid source product' using errcode='22023';
    end if;$v$);
  definition := replace(definition, insert_cols, $c$      barcode,description,brand,stock_unit,selling_price_ugx,cost_price_ugx,is_active,
      sales_unit,allow_decimal_quantity,tax_inclusive
    ) values($c$);
  definition := replace(definition, insert_vals, $i$      (prod->>'active')::boolean,
      nullif(btrim(prod->>'sales_unit'),''),
      (prod->>'allow_decimal_quantity')::boolean,
      (prod->>'tax_inclusive')::boolean
    )$i$);
  definition := replace(definition, update_tail, $u$      cost_price_ugx=excluded.cost_price_ugx,is_active=excluded.is_active,
      sales_unit=coalesce(excluded.sales_unit,desktop_products.sales_unit),
      allow_decimal_quantity=coalesce(excluded.allow_decimal_quantity,desktop_products.allow_decimal_quantity),
      tax_inclusive=coalesce(excluded.tax_inclusive,desktop_products.tax_inclusive),
      updated_at=now();$u$);
  execute definition;
end
$migration$;
