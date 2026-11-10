import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedCatalogue, type HostedCategoryRow, type HostedProductRow } from "@/components/akilibiz/products/hosted-catalogue";

type StockSnapshot = { product_id: string; on_hand_milli: number | null; is_current: boolean };

export async function HostedCataloguePage({ view }: { view: "products" | "categories" }) {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const [
    { data: categories, error: categoryError },
    { data: products, error: productError },
    { data: positions, error: stockError },
  ] = await Promise.all([
    supabase.from("desktop_categories").select("id,name,slug,description,is_active,local_category_id")
      .eq("business_id", business.id).order("local_category_id"),
    supabase.from("desktop_products").select("id,name,sku,category_id,barcode,brand,stock_unit,selling_price_ugx,cost_price_ugx,is_active")
      .eq("business_id", business.id).order("name"),
    supabase.rpc("list_desktop_effective_inventory", { target_business_id: business.id }),
  ]);
  const error = categoryError || productError
    ? "Could not load your products and categories. Check your connection and try again."
    : null;
  const current = new Map<string, number | null>(
    (!stockError ? (positions ?? []) as StockSnapshot[] : [])
      .filter((position) => position.is_current)
      .map((position) => [position.product_id, position.on_hand_milli]),
  );
  const productRows = (error ? [] : products ?? []).map((product) => ({
    ...product,
    stock_quantity: current.has(product.id) ? current.get(product.id) ?? null : null,
  }));
  return (
    <HostedCatalogue
      businessName={business.name}
      error={error}
      stockError={stockError ? "Current stock quantities could not be loaded." : null}
      categories={(error ? [] : categories ?? []) as HostedCategoryRow[]}
      products={productRows as HostedProductRow[]}
      view={view}
    />
  );
}
