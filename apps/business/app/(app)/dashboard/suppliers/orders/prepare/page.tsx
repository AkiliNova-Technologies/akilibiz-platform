"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card,CardContent} from "@/components/ui/card";
import {
  type PurchaseOrderDraftLine,purchaseOrderDraftTotal,
} from "@/lib/purchase-order-draft-validation";

type Supplier={id:string;name:string;local_business_public_id:string};
type Product={id:string;name:string;sku:string;stock_unit:string;local_business_public_id:string};
type Draft={
  id:string;po_number:string;supplier_id:string;source_business_public_id:string;
  order_date:string;expected_delivery:string|null;notes:string|null;
  lines:PurchaseOrderDraftLine[];updated_at:string;
};
type ListResponse={drafts?:Draft[];suppliers?:Supplier[];products?:Product[];error?:string;canPost?:false};

const money=(amount:number)=>new Intl.NumberFormat("en-UG",{
  style:"currency",currency:"UGX",maximumFractionDigits:0,
}).format(amount);
const emptyLine=():PurchaseOrderDraftLine=>({product_id:"",quantity_milli:1000,unit_price_ugx:0});
const newDraft=():Draft=>({
  id:crypto.randomUUID(),po_number:"",supplier_id:"",
  source_business_public_id:"",order_date:new Date().toISOString().slice(0,10),
  expected_delivery:null,notes:null,lines:[emptyLine()],updated_at:"",
});
export default function PreparePurchaseOrderPage(){
  const [drafts,setDrafts]=useState<Draft[]>([]);
  const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [draft,setDraft]=useState<Draft|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const reload=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const response=await fetch("/api/purchasing/drafts",{cache:"no-store"});
      const body=await response.json() as ListResponse;
      if(!response.ok||!body.drafts||!body.suppliers||!body.products)
        throw new Error(body.error??"Could not load purchase order drafts.");
      setDrafts(body.drafts);setSuppliers(body.suppliers);setProducts(body.products);
    }catch(cause){
      setDrafts([]);setSuppliers([]);setProducts([]);
      setError(cause instanceof Error?cause.message:"Purchase order preparation is unavailable.");
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);
  const selectedSupplier=suppliers.find(s=>s.id===draft?.supplier_id);
  const availableProducts=useMemo(()=>products.filter(p=>
    p.local_business_public_id===draft?.source_business_public_id),[draft?.source_business_public_id,products]);
  const total=draft?purchaseOrderDraftTotal(draft.lines):null;
  const setLine=(index:number,change:Partial<PurchaseOrderDraftLine>)=>
    setDraft(current=>current?{...current,lines:current.lines.map((line,i)=>i===index?{...line,...change}:line)}:current);
  const save=async()=>{
    if(!draft||busy)return;
    setBusy(true);setError(null);setNotice(null);
    try{
      const {updated_at:_updated,...payload}=draft;
      const response=await fetch("/api/purchasing/drafts",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
      });
      const body=await response.json() as {error?:string;message?:string};
      if(!response.ok)throw new Error(body.error??"Could not save the draft.");
      setNotice(body.message??"Draft saved.");
      setDraft(null);
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not save draft.");}
    finally{setBusy(false);}
  };
  const discard=async(id:string)=>{
    if(busy||!window.confirm("Discard this purchase order draft?"))return;
    setBusy(true);setError(null);setNotice(null);
    try{
      const response=await fetch(`/api/purchasing/drafts?id=${encodeURIComponent(id)}`,{method:"DELETE"});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Could not discard the draft.");
      if(draft?.id===id)setDraft(null);
      setNotice("Draft discarded.");
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not discard draft.");}
    finally{setBusy(false);}
  };
  return <main className="flex min-w-0 flex-1 flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Prepare purchase orders</h1>
        <p className="text-sm text-muted-foreground">
          Prepare supplier orders with exact quantities and prices. Saving a draft does not place an order or receive stock.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild><Link href="/dashboard/suppliers/orders">Back to orders</Link></Button>
        <Button type="button" variant="outline" onClick={()=>void reload()} disabled={loading||busy}>Refresh</Button>
        <Button type="button" onClick={()=>{setDraft(newDraft());setNotice(null);setError(null);}}
          disabled={loading||busy||!!error}>New draft</Button>
      </div>
    </div>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice&&<p role="status" className="text-sm">{notice}</p>}
    {loading?<p role="status">Loading purchase order drafts…</p>:null}
    {draft&&<Card><CardContent className="space-y-5 p-5">
      <h2 className="text-lg font-semibold">{draft.updated_at?"Edit draft":"New purchase order draft"}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">Purchase order number
          <Input value={draft.po_number} maxLength={100}
            onChange={event=>setDraft({...draft,po_number:event.target.value})}/>
        </label>
        <label className="space-y-1 text-sm">Supplier
          <select className="h-10 w-full rounded-md border bg-background px-3" value={draft.supplier_id}
            disabled={Boolean(draft.updated_at)}
            onChange={event=>{
              const supplier=suppliers.find(s=>s.id===event.target.value);
              setDraft({...draft,supplier_id:supplier?.id??"",
                source_business_public_id:supplier?.local_business_public_id??"",
                lines:[emptyLine()]});
            }}>
            <option value="">Choose supplier</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Order date
          <Input type="date" value={draft.order_date} onChange={event=>setDraft({...draft,order_date:event.target.value})}/>
        </label>
        <label className="space-y-1 text-sm">Expected delivery (optional)
          <Input type="date" min={draft.order_date} value={draft.expected_delivery??""}
            onChange={event=>setDraft({...draft,expected_delivery:event.target.value||null})}/>
        </label>
      </div>
      {draft.supplier_id&&<p className="text-xs text-muted-foreground">Products are restricted to the selected supplier's desktop business.</p>}
      <div className="space-y-3">
        <h3 className="font-semibold">Order lines</h3>
        {draft.lines.map((line,index)=>{
          const lineTotal=purchaseOrderDraftTotal([line]);
          const product=availableProducts.find(p=>p.id===line.product_id);
          return <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] md:items-end">
            <label className="space-y-1 text-sm">Product
              <select className="h-10 w-full rounded-md border bg-background px-3" value={line.product_id}
                onChange={event=>setLine(index,{product_id:event.target.value})}>
                <option value="">Choose product</option>
                {availableProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">Quantity ({product?.stock_unit??"units"})
              <Input inputMode="decimal" type="number" min="0.001" step="0.001"
                value={line.quantity_milli/1000}
                onChange={event=>setLine(index,{quantity_milli:Math.round(Number(event.target.value)*1000)})}/>
            </label>
            <label className="space-y-1 text-sm">UGX per unit
              <Input type="number" inputMode="numeric" min="0" step="1"
                value={line.unit_price_ugx}
                onChange={event=>setLine(index,{unit_price_ugx:Number(event.target.value)})}/>
            </label>
            <Button type="button" variant="outline" disabled={draft.lines.length===1}
              onClick={()=>setDraft({...draft,lines:draft.lines.filter((_,i)=>index!==i)})}>Remove</Button>
            <p className="text-sm text-muted-foreground md:col-span-4">
              Line total: {lineTotal===null?"Invalid quantity or price":money(lineTotal)}
            </p>
          </div>;
        })}
        <Button variant="outline" type="button" disabled={draft.lines.length>=100||!selectedSupplier}
          onClick={()=>setDraft({...draft,lines:[...draft.lines,emptyLine()]})}>Add item</Button>
      </div>
      <label className="block space-y-1 text-sm">Notes
        <Textarea maxLength={2000} value={draft.notes??""}
          onChange={event=>setDraft({...draft,notes:event.target.value||null})}/>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="font-semibold">Draft total: {total===null?"Check item amounts":money(total)}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={()=>setDraft(null)}>Close</Button>
          <Button type="button" disabled={busy||total===null||!selectedSupplier||
            draft.lines.some(line=>!line.product_id)} onClick={()=>void save()}>
            {busy?"Saving…":"Save draft"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Orders are not sent to desktop yet. Desktop approval, goods receiving and supplier VAT posting remain unavailable from this screen.
      </p>
    </CardContent></Card>}
    <Card><CardContent className="space-y-3 p-5">
      <h2 className="font-semibold">Saved purchase order drafts</h2>
      {!loading&&drafts.length===0&&<p className="text-sm text-muted-foreground">No saved purchase order drafts yet.</p>}
      {drafts.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <div>
          <p className="font-medium">{item.po_number}</p>
          <p className="text-xs text-muted-foreground">
            {suppliers.find(s=>s.id===item.supplier_id)?.name??"Supplier unavailable"} ·
            {" "}{item.order_date} · {item.lines.length} product lines ·
            {" "}{purchaseOrderDraftTotal(item.lines)===null?"Invalid amount":money(purchaseOrderDraftTotal(item.lines)??0)}
          </p>
          <p className="text-xs text-muted-foreground">Not sent to desktop</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={()=>{setDraft(item);setNotice(null);}}>Edit</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={()=>void discard(item.id)}>Discard</Button>
        </div>
      </div>)}
    </CardContent></Card>
  </main>;
}
