import Link from "next/link";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

type HostedCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  local_category_id: number;
};
type HostedProduct = {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  selling_price_ugx: number | null;
  cost_price_ugx: number | null;
  is_active: boolean;
};

function ugx(value: number | null): string {
  return value === null ? "Not available" : `UGX ${new Intl.NumberFormat("en-UG").format(value)}`;
}

export default async function SyncedDesktopCataloguePage() {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from("desktop_categories")
        .select("id,name,slug,is_active,local_category_id")
        .eq("business_id", business.id).order("local_category_id"),
      supabase.from("desktop_products")
        .select("id,name,sku,category_id,selling_price_ugx,cost_price_ugx,is_active")
        .eq("business_id", business.id).order("name"),
    ]);
  if (categoryError || productError) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Desktop catalogue</h1>
        <p role="alert" className="text-sm text-destructive">
          Could not load products. Please try again.
        </p>
        <Link href="/dashboard/products" className="text-sm underline">Back to products</Link>
      </main>
    );
  }
  const categories = (categoryRows ?? []) as HostedCategory[];
  const products = (productRows ?? []) as HostedProduct[];
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <Link href="/dashboard/products" className="text-sm text-muted-foreground hover:underline">Back to products</Link>
        <h1 className="text-2xl font-semibold">Desktop catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Products uploaded from AkiliBiz Desktop for {business.name}. This is a cloud snapshot,
          not live stock, sales or accounting data.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg border bg-card px-4 py-3"><strong>{categories.length}</strong> categories</span>
        <span className="rounded-lg border bg-card px-4 py-3"><strong>{products.length}</strong> products</span>
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-8 text-sm text-muted-foreground">
          No products available.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Selling price</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">{names.get(product.category_id) ?? "Unknown"}</td>
                  <td className="px-4 py-3 tabular-nums">{ugx(product.selling_price_ugx)}</td>
                  <td className="px-4 py-3">{product.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
