"use client";
import { Building2, Users } from "lucide-react";
import { HostedSuppliers } from "@/components/akilibiz/contacts/hosted-suppliers";
import { DataTable, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";

export interface HostedCustomer extends TableData {
  id: string; name: string; email: string | null; phone: string | null;
  address: string | null; customer_type: string; loyalty_points: number; is_active: boolean;
}
export interface HostedSupplier extends TableData {
  id: string; name: string; contact_person: string; phone: string;
  email: string | null; address: string | null; payment_terms: string; is_active: boolean;
  products_supplied?: null; total_purchases?: null; outstanding_balance?: null; last_supply_date?: null;
}
const customerFields: TableField<HostedCustomer>[] = [
  {key:"name",header:"Customer"},
  {key:"phone",header:"Phone",cell:(v)=>v?String(v):"—"},
  {key:"email",header:"Email",cell:(v)=>v?String(v):"—"},
  {key:"customer_type",header:"Type"},
  {key:"loyalty_points",header:"Loyalty points",align:"right"},
  {key:"is_active",header:"Status",cell:(v)=><Badge variant={v?"outline":"secondary"}>{v?"Active":"Inactive"}</Badge>}
];
const supplierFields: TableField<HostedSupplier>[] = [
  {key:"name",header:"Supplier"},
  {key:"contact_person",header:"Contact person"},
  {key:"phone",header:"Phone"},
  {key:"email",header:"Email",cell:(v)=>v?String(v):"—"},
  {key:"payment_terms",header:"Payment terms"},
  {key:"is_active",header:"Status",cell:(v)=><Badge variant={v?"outline":"secondary"}>{v?"Active":"Inactive"}</Badge>}
];
export function HostedDirectory({view,businessName,customers,suppliers}:{
  view:"customers"|"suppliers";businessName:string;customers:HostedCustomer[];suppliers:HostedSupplier[];
}){
  if (view === "suppliers") return <HostedSuppliers suppliers={suppliers} />;
  const customerView=view==="customers";
  const rows=customerView?customers:suppliers;
  return <main className="flex min-w-0 flex-col gap-5">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">{customerView?"Customer Management":"Supplier Management"}</h1>
      <p className="text-sm text-muted-foreground">Contact records from your desktop business · {businessName}</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <MetricCard title={customerView?"Total customers":"Total suppliers"} value={String(rows.length)}
        icon={customerView?<Users className="size-5"/>:<Building2 className="size-5"/>} description="Available in AkiliBiz Cloud"/>
      <MetricCard title="Active contacts" value={String(rows.filter(x=>x.is_active).length)}
        icon={customerView?<Users className="size-5"/>:<Building2 className="size-5"/>} description="Currently active on desktop"/>
    </div>
    <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
      Read-only desktop contact directory. To change these details, use AkiliBiz Desktop and upload the directory again.
      Credit balances, payables and sales history are not included.
    </p>
    {customerView
      ? <DataTable<HostedCustomer> data={customers} fields={customerFields} title="Customers"
          enableSelection={false} enableGlobalSearch searchPlaceholder="Search customers..." emptyMessage="No customers uploaded from desktop yet."/>
      : <DataTable<HostedSupplier> data={suppliers} fields={supplierFields} title="Suppliers"
          enableSelection={false} enableGlobalSearch searchPlaceholder="Search suppliers..." emptyMessage="No suppliers uploaded from desktop yet."/>}
  </main>;
}
