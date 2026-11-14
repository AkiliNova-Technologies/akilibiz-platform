import Link from "next/link";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  type HostedMovement, validateHostedMovement, sourceProductKey, formatMilliStock,
} from "@/lib/hosted-stock-movement-history";
import { Button } from "@/components/ui/button";

type Query = { page?: string | string[] };
type Product = { local_product_id:number; local_business_public_id:string; name:string; sku:string; stock_unit:string };

export default async function InventoryStockHistoryPage({
  searchParams,
}: { searchParams: Promise<Query> }) {
  const active = await requireActiveBusiness();
  const supabase = await createClient();
  const params = await searchParams;
  const requested = typeof params.page === "string" && /^[1-9][0-9]{0,4}$/.test(params.page)
    ? Number(params.page) : 1;
  const pageSize = 50;
  const result = await supabase.rpc("list_desktop_inventory_movement_history",{
    target_business_id:active.id,
    page_offset:(requested-1)*pageSize,
    page_limit:pageSize,
  });
  let error = result.error ? "Stock history is not available yet. Your existing stock records were not changed." : null;
  const raw = (result.data ?? []) as HostedMovement[];
  const total = raw[0]?.total_count ?? 0;
  if (!error && raw.some(row=>!validateHostedMovement(row))) {
    error = "Some stock movements could not be verified. Try again later.";
  }
  const pageCount = Math.max(1,Math.ceil(total/pageSize));
  const page = requested > pageCount ? pageCount : requested;
  const movements = error || requested > pageCount ? [] : raw;
  const sources = [...new Set(movements.map(row=>row.local_business_public_id))];
  const productResult = movements.length
    ? await supabase.from("desktop_products")
        .select("local_product_id,local_business_public_id,name,sku,stock_unit")
        .eq("business_id",active.id).in("local_business_public_id",sources)
        .limit(5000)
    : { data: [] as Product[], error: null };
  if (productResult.error) error = "Could not identify the products in the stock movement history.";
  const names = new Map(
    ((productResult.data ?? []) as Product[]).map(row=>[
      sourceProductKey(row.local_business_public_id,row.local_product_id),row,
    ]),
  );
  const href=(next:number)=>`/dashboard/inventory/history?page=${next}`;
  return <main className="flex flex-1 flex-col gap-5">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">Stock Movement History</h1>
      <p className="text-sm text-muted-foreground">
        Verified desktop movements received by AkiliBiz Web. Historical movements before
        the first synchronized checkpoint may not be included.
      </p>
    </div>
    {error ? <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" role="alert">{error}</div>
      : <div className="text-sm text-muted-foreground">{total.toLocaleString("en-UG")} synchronized movements</div>}
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Movement</th>
            <th className="px-4 py-3 font-medium">Change</th>
            <th className="px-4 py-3 font-medium">Before</th>
            <th className="px-4 py-3 font-medium">After</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Received</th>
          </tr>
        </thead>
        <tbody>
          {!error && movements.map(row=>{
            const product=names.get(sourceProductKey(row.local_business_public_id,row.local_product_id));
            const unit=product?.stock_unit??"units";
            return <tr key={row.movement_id} className="border-b last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium">{product?.name??"Product unavailable"}</div>
                <div className="text-xs text-muted-foreground">{product?.sku??`Source ID ${row.local_product_id}`}</div>
              </td>
              <td className="px-4 py-3">{row.movement_type?.replaceAll("_"," ")??"Stock change"}</td>
              <td className="px-4 py-3 tabular-nums">{row.delta_milli>0?"+":""}{formatMilliStock(row.delta_milli)} {unit}</td>
              <td className="px-4 py-3 tabular-nums">{formatMilliStock(row.before_milli)} {unit}</td>
              <td className="px-4 py-3 tabular-nums">{formatMilliStock(row.after_milli)} {unit}</td>
              <td className="px-4 py-3">{row.reason??"—"}</td>
              <td className="px-4 py-3">{new Date(row.accepted_at).toLocaleString("en-UG",{timeZone:"Africa/Kampala"})}</td>
            </tr>;
          })}
          {!error && movements.length===0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
            No synchronized movement receipts are available for this business.
          </td></tr>}
        </tbody>
      </table>
    </div>
    {!error && <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
      <div className="flex gap-2">
        {page>1?<Button asChild variant="outline"><Link href={href(page-1)}>Previous</Link></Button>:
          <Button disabled variant="outline">Previous</Button>}
        {page<pageCount?<Button asChild variant="outline"><Link href={href(page+1)}>Next</Link></Button>:
          <Button disabled variant="outline">Next</Button>}
      </div>
    </div>}
  </main>;
}
