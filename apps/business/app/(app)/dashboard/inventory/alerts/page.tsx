import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedLowStockAlerts } from "@/components/akilibiz/inventory/hosted-low-stock-alerts";
import type { Position, ProductSummary } from "@/components/akilibiz/inventory/hosted-inventory";

export default async function InventoryLowStockAlertsPage() {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const [
    { data: positions, error: positionError },
    { data: products, error: productError },
  ] = await Promise.all([
    supabase.rpc("list_desktop_effective_inventory", { target_business_id: business.id }),
    supabase.from("desktop_products")
      .select("id,name,sku,stock_unit,is_active")
      .eq("business_id", business.id).order("name").limit(1000),
  ]);

  const loadError = positionError || productError
    ? "Could not load your stock alerts. Check your connection and try again."
    : null;

  return <HostedLowStockAlerts
    error={loadError}
    positions={(loadError ? [] : positions ?? []) as Position[]}
    products={(loadError ? [] : products ?? []) as ProductSummary[]}
  />;
}
