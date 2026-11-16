"use client";

import * as React from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {Card,CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {loadAllFinancialMirrorRows} from "@/components/akilibiz/finance/financial-mirror-client";
import {mapHostedPurchaseOrder} from "@/components/akilibiz/suppliers/purchase-order-mapper";
import {mapPurchaseOrderLines} from "@/components/akilibiz/suppliers/purchase-order-detail";
import {
  type PreparedGoodsReceipt, type PreparedSupplierInvoice,
  preparedReceiptTotal,
} from "@/lib/goods-receipt-draft-validation";
import {parseMilliQuantityInput} from "@/lib/purchase-order-draft-validation";

type Order={id:number;source:string;number:string;supplier:string;status:string};
type OrderLine={id:number;product_id:number;remaining:number;price:number;unit:string|null};
type SavedDraft=PreparedGoodsReceipt&{updated_at:string};
const currency=(amount:number)=>new Intl.NumberFormat("en-UG",{
  style:"currency",currency:"UGX",maximumFractionDigits:0,
}).format(amount);
const today=()=>{
  const pieces=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Africa/Kampala",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const read=(kind:string)=>pieces.find(piece=>piece.type===kind)?.value??"";
  return `${read("year")}-${read("month")}-${read("day")}`;
};
const emptyReceipt=(order:Order):PreparedGoodsReceipt=>({
  id:crypto.randomUUID(),
  source_business_public_id:order.source,
  purchase_order_id:order.id,
  receipt_number:"",
  receipt_date:today(),
  supplier_reference:null,
  due_date:null,
  lines:[],
  supplier_vat:null,
});
const initialInvoice=(receipt:PreparedGoodsReceipt):PreparedSupplierInvoice=>({
  source_kind:"TAX_INVOICE",invoice_number:"",invoice_date:receipt.receipt_date,
  evidence_reference:"",supplier_tin:null,declared_vat_ugx:0,
  lines:receipt.lines.map(line=>({
    product_id:line.product_id,classification_code:"" as PreparedSupplierInvoice["lines"][number]["classification_code"],tax_inclusive:false,
  })),
});

export default function PrepareGoodsReceiptPage(){
  const [orders,setOrders]=React.useState<Order[]>([]);
  const [orderLines,setOrderLines]=React.useState<OrderLine[]>([]);
  const [saved,setSaved]=React.useState<SavedDraft[]>([]);
  const [draft,setDraft]=React.useState<PreparedGoodsReceipt|null>(null);
  const [loading,setLoading]=React.useState(true);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);
  const [notice,setNotice]=React.useState<string|null>(null);
  const reload=React.useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const response=await fetch("/api/purchasing/receipts/drafts",{cache:"no-store"});
      const body=await response.json() as {drafts?:SavedDraft[];error?:string};
      if(!response.ok||!Array.isArray(body.drafts))
        throw new Error(body.error??"Goods receipt preparation is unavailable.");
      const rows=await loadAllFinancialMirrorRows("purchase_orders");
      const mapped=rows.map(mapHostedPurchaseOrder).filter((o):o is NonNullable<typeof o>=>o!==null)
        .filter(o=>o.status==="Pending"||o.status==="Partially Received");
      setOrders(mapped.map(o=>({
        id:o.id,source:o.source_business_public_id,number:o.po_number,
        supplier:o.supplier_name,status:o.status,
      })));
      setSaved(body.drafts);
    }catch(cause){
      setOrders([]);setSaved([]);
      setError(cause instanceof Error?cause.message:"Could not load the receipt preparation register.");
    }finally{setLoading(false);}
  },[]);
  React.useEffect(()=>{queueMicrotask(()=>void reload());},[reload]);
  const selectedOrder=orders.find(o=>draft&&o.id===draft.purchase_order_id&&
    o.source===draft.source_business_public_id);
  const loadLines=React.useCallback(async(order:Order)=>{
    const all=await loadAllFinancialMirrorRows("purchase_order_lines");
    const valid=mapPurchaseOrderLines({
      id:order.id,localBusinessPublicId:order.source,
    },all);
    setOrderLines(valid.map(line=>({
      id:line.id,product_id:line.product_id,
      remaining:line.ordered_quantity_milli-line.received_quantity_milli,
      price:line.unit_price_ugx,unit:line.stock_unit,
    })).filter(line=>line.remaining>0));
  },[]);
  const start=async(order:Order)=>{
    setError(null);setNotice(null);setDraft(null);setOrderLines([]);
    try{
      await loadLines(order);
      setDraft(emptyReceipt(order));
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not verify order lines.");
    }
  };
  const edit=async(item:SavedDraft)=>{
    const order=orders.find(o=>o.id===item.purchase_order_id&&o.source===item.source_business_public_id);
    if(!order){setError("The original purchase order is no longer open.");return;}
    setError(null);setNotice(null);setDraft(null);setOrderLines([]);
    try{await loadLines(order);setDraft(item);}
    catch(cause){setError(cause instanceof Error?cause.message:"Cannot verify receipt lines.");}
  };
  const update=(change:Partial<PreparedGoodsReceipt>)=>
    setDraft(current=>current?{...current,...change}:null);
  const lineFor=(id:number)=>draft?.lines.find(line=>line.purchase_order_line_id===id);
  const setLine=(orderLine:OrderLine,quantity:number,price:number)=>{
    if(!draft)return;
    const remaining=draft.lines.filter(line=>line.purchase_order_line_id!==orderLine.id);
    if(quantity>0){
      remaining.push({
        purchase_order_line_id:orderLine.id,product_id:orderLine.product_id,
        quantity_milli:quantity,unit_cost_ugx:price,
      });
    }
    const lines=orderLines.flatMap(line=>{
      const row=remaining.find(item=>item.purchase_order_line_id===line.id);
      return row?[row]:[];
    });
    update({lines,supplier_vat:null});
  };
  const total=draft?preparedReceiptTotal(draft.lines):null;
  const save=async()=>{
    if(!draft||busy||total===null||!draft.lines.length)return;
    setBusy(true);setError(null);setNotice(null);
    try{
      const {updated_at:_updated,...payload}=draft as SavedDraft;
      const response=await fetch("/api/purchasing/receipts/drafts",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      const body=await response.json() as {error?:string;message?:string};
      if(!response.ok)throw new Error(body.error??"Could not save goods receipt draft.");
      setNotice(body.message??"Goods receipt draft saved.");
      setDraft(null);setOrderLines([]);
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not save goods receipt draft.");}
    finally{setBusy(false);}
  };
  const discard=async(item:SavedDraft)=>{
    if(busy||!window.confirm("Discard this goods receipt draft?"))return;
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/purchasing/receipts/drafts?id=${encodeURIComponent(item.id)}`,{method:"DELETE"});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Could not discard draft.");
      setNotice("Goods receipt draft discarded.");
      if(draft?.id===item.id)setDraft(null);
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not discard receipt draft.");}
    finally{setBusy(false);}
  };
  return <main className="flex min-w-0 flex-1 flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Prepare goods receiving</h1>
        <p className="text-sm text-muted-foreground">
          Record what the supplier delivered. A saved draft does not increase stock, create payables or claim VAT.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline"><Link href="/dashboard/suppliers/orders">Back to orders</Link></Button>
        <Button variant="outline" disabled={busy||loading} onClick={()=>void reload()}>Refresh</Button>
      </div>
    </div>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice&&<p role="status" className="text-sm">{notice}</p>}
    {loading&&<p role="status" className="text-sm">Loading synchronized purchase orders…</p>}
    <Card><CardContent className="space-y-3 p-5">
      <h2 className="font-semibold">Open purchase orders</h2>
      {!loading&&!orders.length&&<p className="text-sm text-muted-foreground">No synchronized orders are ready for receiving.</p>}
      {orders.map(order=><div key={order.source+":"+order.id}
        className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
        <div>
          <p className="font-medium">{order.number}</p>
          <p className="text-xs text-muted-foreground">{order.supplier} · {order.status}</p>
        </div>
        <Button size="sm" variant="outline" disabled={busy}
          onClick={()=>void start(order)}>Prepare delivery</Button>
      </div>)}
    </CardContent></Card>
    {draft&&<Card><CardContent className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Delivery for {selectedOrder?.number??"purchase order"}</h2>
        <p className="text-sm text-muted-foreground">Quantities are in the product stock unit. Save only quantities physically delivered.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">Goods receipt number
          <Input value={draft.receipt_number} maxLength={100}
            onChange={event=>update({receipt_number:event.target.value})}/>
        </label>
        <label className="space-y-1 text-sm">Date received
          <Input type="date" value={draft.receipt_date}
            onChange={event=>update({receipt_date:event.target.value})}/>
        </label>
        <label className="space-y-1 text-sm">Supplier reference (optional)
          <Input value={draft.supplier_reference??""} maxLength={160}
            onChange={event=>update({supplier_reference:event.target.value||null})}/>
        </label>
        <label className="space-y-1 text-sm">Payment due date (optional)
          <Input type="date" min={draft.receipt_date} value={draft.due_date??""}
            onChange={event=>update({due_date:event.target.value||null})}/>
        </label>
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">Products delivered</h3>
        {!orderLines.length&&<p className="text-sm text-muted-foreground">No available quantity remains in this synchronized order.</p>}
        {orderLines.map(line=>{
          const chosen=lineFor(line.id);
          return <div key={line.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px_160px]">
            <div className="text-sm">
              <p className="font-medium">Product #{line.product_id}</p>
              <p className="text-muted-foreground">Remaining: {line.remaining/1000} {line.unit??"units"}</p>
            </div>
            <label className="space-y-1 text-sm">Delivered quantity
              <Input type="number" min="0" max={line.remaining/1000} step="0.001"
                value={chosen?chosen.quantity_milli/1000:0}
                onChange={event=>{
                  const text=event.target.value;
                  const qty=text==="0"||text===""?0:(parseMilliQuantityInput(text)??Number.NaN);
                  if(!Number.isSafeInteger(qty)||qty<0||qty>line.remaining){
                    setError("Enter a valid delivered quantity within the remaining order balance (up to three decimal places).");
                    return;
                  }
                  setError(null);
                  setLine(line,qty,chosen?.unit_cost_ugx??line.price);
                }}/>
            </label>
            <label className="space-y-1 text-sm">Unit cost (UGX)
              <Input type="number" min="0" step="1"
                value={chosen?.unit_cost_ugx??line.price}
                onChange={event=>setLine(line,chosen?.quantity_milli??0,Number(event.target.value))}/>
            </label>
          </div>;
        })}
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">Supplier VAT document</h3>
        <p className="text-xs text-muted-foreground">
          Only enter VAT details shown on the supplier invoice. These details are evidence for later desktop review, not an automatic input VAT claim.
        </p>
        <label className="block space-y-1 text-sm">Invoice evidence
          <Select value={draft.supplier_vat?"invoice":"none"} onValueChange={value=>
            update({supplier_vat:value==="invoice"?initialInvoice(draft):null})}>
            <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No supplier VAT document provided</SelectItem>
              <SelectItem value="invoice">Record supplier tax invoice</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {draft.supplier_vat&&(()=>{
          const evidence=draft.supplier_vat;
          const change=(partial:Partial<PreparedSupplierInvoice>)=>
            update({supplier_vat:{...evidence,...partial}});
          return <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">Document type
                <Select value={evidence.source_kind} onValueChange={value=>
                  change({source_kind:value as PreparedSupplierInvoice["source_kind"]})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFRIS_E_INVOICE">EFRIS e-invoice</SelectItem>
                    <SelectItem value="TAX_INVOICE">Tax invoice</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1 text-sm">Invoice number
                <Input value={evidence.invoice_number} maxLength={100}
                  onChange={event=>change({invoice_number:event.target.value})}/>
              </label>
              <label className="space-y-1 text-sm">Invoice date
                <Input type="date" value={evidence.invoice_date}
                  onChange={event=>change({invoice_date:event.target.value})}/>
              </label>
              <label className="space-y-1 text-sm">Evidence reference
                <Input value={evidence.evidence_reference} maxLength={160}
                  onChange={event=>change({evidence_reference:event.target.value})}/>
              </label>
              <label className="space-y-1 text-sm">Supplier TIN (optional)
                <Input value={evidence.supplier_tin??""} maxLength={100}
                  onChange={event=>change({supplier_tin:event.target.value||null})}/>
              </label>
              <label className="space-y-1 text-sm">VAT stated on invoice (UGX)
                <Input type="number" min="0" step="1" value={evidence.declared_vat_ugx}
                  onChange={event=>change({declared_vat_ugx:Number(event.target.value)})}/>
              </label>
            </div>
            {evidence.lines.map((entry,index)=><div key={entry.product_id}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <span className="text-sm">Product #{entry.product_id}</span>
              <Select value={entry.classification_code||undefined} onValueChange={value=>{
                change({lines:evidence.lines.map((line,i)=>i===index?{
                  ...line,classification_code:value as typeof line.classification_code,
                }:line)});
              }}>
                <SelectTrigger className="w-[190px]"><SelectValue placeholder="Choose VAT treatment"/></SelectTrigger>
                <SelectContent>
                  {(["STANDARD_RATED","ZERO_RATED","EXEMPT","OUT_OF_SCOPE"] as const)
                    .map(code=><SelectItem key={code} value={code}>
                      {code.replaceAll("_"," ")}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={entry.tax_inclusive}
                  onChange={event=>change({lines:evidence.lines.map((line,i)=>
                    i===index?{...line,tax_inclusive:event.target.checked}:line)})}/>
                Price includes VAT
              </label>
            </div>)}
          </div>;
        })()}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="font-semibold">Delivery cost: {total===null?"Invalid amount":currency(total)}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>{setDraft(null);setOrderLines([]);}}>Close</Button>
          <Button disabled={busy||!draft.receipt_number.trim()||total===null||!draft.lines.length}
            onClick={()=>void save()}>{busy?"Saving…":"Save receipt draft"}</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Desktop receiving and approval are not connected to this form yet. Saving never posts stock, supplier payables, or VAT.
      </p>
    </CardContent></Card>}
    <Card><CardContent className="space-y-3 p-5">
      <h2 className="font-semibold">Saved goods receipt drafts</h2>
      {!loading&&!saved.length&&<p className="text-sm text-muted-foreground">No receipt drafts yet.</p>}
      {saved.map(item=><div key={item.id}
        className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
        <div>
          <p className="font-medium">{item.receipt_number}</p>
          <p className="text-xs text-muted-foreground">
            Purchase order #{item.purchase_order_id} · {item.receipt_date} ·
            {" "}{preparedReceiptTotal(item.lines)===null?"Invalid amount":currency(preparedReceiptTotal(item.lines)??0)}
          </p>
          <p className="text-xs text-muted-foreground">Not received on desktop</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy}
            onClick={()=>void edit(item)}>Edit</Button>
          <Button size="sm" variant="outline" disabled={busy}
            onClick={()=>void discard(item)}>Discard</Button>
        </div>
      </div>)}
    </CardContent></Card>
  </main>;
}
