"use client";
import { Package, Warehouse } from "lucide-react";
import { DataTable, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";

export type Position = TableData & {
 id:string;product_id:string;on_hand_milli:number|null;reserved_milli:number|null;
 damaged_milli:number|null;minimum_milli:number|null;maximum_milli:number|null;
 is_current:boolean;snapshot_at:string;ledger_checkpoint_id?:string|null;ledger_movement_id?:number|null;product_name?:string;sku?:string;
};
export type ProductSummary={id:string;name:string;sku:string;stock_unit:string;is_active:boolean};
function quantity(value:number|null,unit:string) {
 if(value===null||!Number.isSafeInteger(value)) return "Not verified";
 return `${new Intl.NumberFormat("en-UG",{maximumFractionDigits:3}).format(value/1000)} ${unit}`;
}
export function HostedInventory({positions,products,businessName}:{
 positions:Position[];products:ProductSummary[];businessName:string;
}) {
 const names=new Map(products.map(p=>[p.id,p]));
 const active=positions.filter(p=>p.is_current);
 const displayPositions=positions.map(p=>({...p,product_name:names.get(p.product_id)?.name??"Unknown product",sku:names.get(p.product_id)?.sku??""}));
 const fields:TableField<Position>[]=[
   {key:"product_name",header:"Product"},
   {key:"sku",header:"SKU"},
   {key:"on_hand_milli",header:"On hand",align:"right",
    cell:(_,p)=>quantity(p.on_hand_milli,names.get(p.product_id)?.stock_unit??"units")},
   {key:"reserved_milli",header:"Reserved",align:"right",
    cell:(_,p)=>quantity(p.reserved_milli,names.get(p.product_id)?.stock_unit??"units")},
   {key:"minimum_milli",header:"Minimum",align:"right",
    cell:(_,p)=>quantity(p.minimum_milli,names.get(p.product_id)?.stock_unit??"units")},
   {key:"is_current",header:"Status",cell:(_,p)=><Badge variant="outline">{p.ledger_checkpoint_id?"Synced":"Snapshot"}</Badge>}
 ];
 return <main className="flex min-w-0 flex-col gap-5">
  <div className="space-y-1">
   <h1 className="text-2xl font-semibold">Inventory Overview</h1>
   <p className="text-sm text-muted-foreground">{businessName} · Stock positions uploaded from AkiliBiz Desktop</p>
  </div>
  <section className="grid gap-4 md:grid-cols-2">
   <MetricCard title="Stock positions" value={String(active.length)}
      description="Current positions available in cloud" icon={<Warehouse className="size-5"/>}/>
   <MetricCard title="Products with verified stock" value={String(active.filter(p=>p.on_hand_milli!==null).length)}
      description="Exact recorded quantities" icon={<Package className="size-5"/>}/>
  </section>
  <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
    Read-only inventory from AkiliBiz Desktop. Verified stock movements update quantities after the initial checkpoint.
    Values marked Not verified have no exact recorded quantity. No new sales or accounting entries are created in the cloud.
  </p>
  <DataTable<Position> title="Inventory positions" data={displayPositions} fields={fields}
    enableSelection={false} enableGlobalSearch searchPlaceholder="Search inventory..."
    emptyMessage="No inventory snapshot uploaded. Use Backup & Restore → Cloud connection in AkiliBiz Desktop."/>
 </main>;
}
