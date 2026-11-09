import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedCatalogue, type HostedCategoryRow, type HostedProductRow } from "@/components/akilibiz/products/hosted-catalogue";

export async function HostedCataloguePage({view}:{view:"products"|"categories"}) {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const [{data:categories,error:categoryError},{data:products,error:productError}] = await Promise.all([
    supabase.from("desktop_categories").select("id,name,slug,description,is_active,local_category_id")
      .eq("business_id",business.id).order("local_category_id"),
    supabase.from("desktop_products").select("id,name,sku,category_id,barcode,brand,selling_price_ugx,cost_price_ugx,is_active")
      .eq("business_id",business.id).order("name")
  ]);
  const error = categoryError || productError
    ? "Could not load your products and categories. Check your connection and try again."
    : null;
  return <HostedCatalogue businessName={business.name}
    error={error}
    categories={(error ? [] : categories ?? []) as HostedCategoryRow[]}
    products={(error ? [] : products ?? []) as HostedProductRow[]} view={view}/>;
}
