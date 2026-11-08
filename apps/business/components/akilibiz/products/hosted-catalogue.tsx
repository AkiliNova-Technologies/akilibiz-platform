"use client";

import { Boxes, FolderTree, Package, PackageCheck } from "lucide-react";
import Link from "next/link";
import { DataTable, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";

export type HostedCategoryRow = TableData & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  local_category_id: number;
};

export type HostedProductRow = TableData & {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  barcode: string | null;
  brand: string | null;
  selling_price_ugx: number | null;
  cost_price_ugx: number | null;
  is_active: boolean;
};

function money(value: number | null) {
  if (value == null || !Number.isSafeInteger(value)) return "—";
  return new Intl.NumberFormat("en-UG", {style:"currency",currency:"UGX",maximumFractionDigits:0}).format(value);
}

export function HostedCatalogue({businessName,categories,products,view}:{
  businessName:string;
  categories:HostedCategoryRow[];
  products:HostedProductRow[];
  view:"products"|"categories";
}) {
  const categoryNames = new Map(categories.map((category)=>[category.id,category.name]));
  const productFields:TableField<HostedProductRow>[] = [
    {key:"name",header:"Product",enableSorting:true},
    {key:"sku",header:"SKU",cell:(v)=><span className="font-mono text-xs">{String(v)}</span>},
    {key:"category_id",header:"Category",cell:(_,r)=><Badge variant="outline">{categoryNames.get(r.category_id)??"Unknown"}</Badge>},
    {key:"selling_price_ugx",header:"Selling price",align:"right",cell:(v)=>money(v as number|null)},
    {key:"is_active",header:"Status",cell:(v)=><Badge variant={v?"outline":"secondary"}>{v?"Active":"Inactive"}</Badge>},
  ];
  const categoryFields:TableField<HostedCategoryRow>[] = [
    {key:"name",header:"Category",enableSorting:true},
    {key:"slug",header:"Slug",cell:(v)=><span className="font-mono text-xs">{String(v)}</span>},
    {key:"description",header:"Description",cell:(v)=><span className="text-muted-foreground">{String(v??"—")}</span>},
    {key:"local_category_id",header:"Products",cell:(_,r)=>products.filter(p=>p.category_id===r.id).length,align:"center"},
    {key:"is_active",header:"Status",cell:(v)=><Badge variant={v?"outline":"secondary"}>{v?"Active":"Inactive"}</Badge>},
  ];
  return <div className="flex flex-1 flex-col gap-6">
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{view==="products"?"Product Catalogue":"Category Management"}</h1>
      <p className="text-sm text-muted-foreground">Business: {businessName}. Your uploaded desktop catalogue is available here.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className={view==="products"?"font-semibold text-primary":"text-muted-foreground hover:text-foreground"} href="/dashboard/products">Products</Link>
        <Link className={view==="categories"?"font-semibold text-primary":"text-muted-foreground hover:text-foreground"} href="/dashboard/products/categories">Categories</Link>
      </div>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Total products" value={String(products.length)} icon={<Package className="size-5"/>} description="Uploaded to the cloud"/>
      <MetricCard title="Active products" value={String(products.filter(p=>p.is_active).length)} icon={<PackageCheck className="size-5"/>} description="Active in desktop catalogue"/>
      <MetricCard title="Categories" value={String(categories.length)} icon={<FolderTree className="size-5"/>} description="Uploaded from desktop"/>
      <MetricCard title="Active categories" value={String(categories.filter(c=>c.is_active).length)} icon={<Boxes className="size-5"/>} description="Active in desktop catalogue"/>
    </section>
    <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
      Desktop catalogue view · Changes must be made on AkiliBiz Desktop and uploaded again.
      This view does not include live stock levels, sales or accounting balances.
    </div>
    {view==="products"
      ? <DataTable<HostedProductRow> key="products" title="Products" description="Records for your selected business" data={products} fields={productFields} enableGlobalSearch searchPlaceholder="Search products..." enableSelection={false} pageSize={10} />
      : <DataTable<HostedCategoryRow> key="categories" title="Categories" description="Records for your selected business" data={categories} fields={categoryFields} enableGlobalSearch searchPlaceholder="Search categories..." enableSelection={false} pageSize={10} />}
  </div>;
}
