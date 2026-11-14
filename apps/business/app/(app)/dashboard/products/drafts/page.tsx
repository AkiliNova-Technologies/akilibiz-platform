"use client";

import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { ArrowLeft,FilePenLine,Plus,Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseProductDraft,type ProductDraftInput } from "@/lib/product-draft-validation";

type Category={id:string;name:string;local_business_public_id:string;is_active:boolean};
type Draft=ProductDraftInput & {updated_at:string};
type Response={drafts?:Draft[];categories?:Category[];error?:string};
type Editor={id:string;name:string;sku:string;category_id:string;barcode:string;brand:string;description:string;stock_unit:string;cost:string;selling:string};
const empty=():Editor=>({id:crypto.randomUUID(),name:"",sku:"",category_id:"",barcode:"",brand:"",description:"",stock_unit:"pcs",cost:"",selling:""});
const initial:Editor={id:"",name:"",sku:"",category_id:"",barcode:"",brand:"",description:"",stock_unit:"pcs",cost:"",selling:""};
const money=(value:number)=>new Intl.NumberFormat("en-UG",{style:"currency",currency:"UGX",maximumFractionDigits:0}).format(value);

export default function ProductDraftsPage() {
  const [drafts,setDrafts]=useState<Draft[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [editing,setEditing]=useState<Editor|null>(null);
  const [discardId,setDiscardId]=useState<string|null>(null);

  const reload=useCallback(async()=>{
    setLoading(true);setError(null);
    try {
      const result=await fetch("/api/products/drafts",{cache:"no-store"});
      const body=await result.json() as Response;
      if(!result.ok)throw new Error(body.error??"Product drafts are unavailable.");
      setDrafts(body.drafts??[]);
      setCategories(body.categories??[]);
    }catch(cause){
      setDrafts([]);setCategories([]);
      setError(cause instanceof Error?cause.message:"Could not load drafts.");
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);

  const openDraft=(row:Draft)=>{
    setMessage(null);setError(null);
    setEditing({
      id:row.id,name:row.name,sku:row.sku,category_id:row.category_id,
      barcode:row.barcode??"",brand:row.brand??"",description:row.description??"",
      stock_unit:row.stock_unit,cost:String(row.cost_price_ugx),
      selling:String(row.selling_price_ugx),
    });
  };
  const save=async()=>{
    if(!editing||busy)return;
    const number=(raw:string)=>/^\d{1,15}$/.test(raw.trim())?Number(raw.trim()):NaN;
    const input=parseProductDraft({
      id:editing.id,name:editing.name,sku:editing.sku,category_id:editing.category_id,
      barcode:editing.barcode||null,brand:editing.brand||null,
      description:editing.description||null,stock_unit:editing.stock_unit,
      cost_price_ugx:number(editing.cost),selling_price_ugx:number(editing.selling),
    });
    if(!input){setError("Complete name, SKU, category, unit, and valid whole-UGX prices.");return;}
    setBusy(true);setError(null);setMessage(null);
    try{
      const response=await fetch("/api/products/drafts",{
        method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(input),
      });
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Draft could not be saved.");
      setEditing(null);
      setMessage("Product draft saved. It is not yet in your live catalogue.");
      await reload();
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Draft could not be saved.");
    }finally{setBusy(false);}
  };
  const discard=async()=>{
    if(!discardId||busy)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/products/drafts?id=${encodeURIComponent(discardId)}`,{
        method:"DELETE",cache:"no-store",
      });
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Could not discard draft.");
      setDiscardId(null);
      setMessage("Draft discarded. No desktop product was changed.");
      await reload();
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not discard draft.");
    }finally{setBusy(false);}
  };
  const field=(key:keyof Editor,value:string)=>setEditing(current=>current?{...current,[key]:value}:null);

  return <main className="flex min-w-0 flex-1 flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/products"><ArrowLeft className="size-4"/>Product catalogue</Link></Button>
        <h1 className="text-2xl font-semibold">Prepare Products</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create and edit private web drafts before adding products on AkiliBiz Desktop.
          Drafts do not change stock, VAT, selling prices, or the live product catalogue.
        </p>
      </div>
      <Button disabled={loading||busy} onClick={()=>{setEditing(empty());setError(null);setMessage(null);}}>
        <Plus className="size-4"/>New draft
      </Button>
    </div>
    {error&&<p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive" role="alert">{error}</p>}
    {message&&<p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
    {editing&&<Card>
      <CardHeader><CardTitle>{drafts.some(d=>d.id===editing.id)?"Edit draft":"New product draft"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="draft-name">Product name</Label>
            <Input id="draft-name" maxLength={200} value={editing.name} disabled={busy} onChange={e=>field("name",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-sku">SKU</Label>
            <Input id="draft-sku" maxLength={160} value={editing.sku} disabled={busy} onChange={e=>field("sku",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-category">Category</Label>
            <select id="draft-category" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              disabled={busy} value={editing.category_id} onChange={e=>field("category_id",e.target.value)}>
              <option value="">Choose a category</option>
              {categories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="draft-unit">Stock unit</Label>
            <Input id="draft-unit" maxLength={40} value={editing.stock_unit} disabled={busy} onChange={e=>field("stock_unit",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-cost">Cost price (UGX)</Label>
            <Input id="draft-cost" inputMode="numeric" value={editing.cost} disabled={busy} onChange={e=>field("cost",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-selling">Selling price (UGX)</Label>
            <Input id="draft-selling" inputMode="numeric" value={editing.selling} disabled={busy} onChange={e=>field("selling",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-barcode">Barcode (optional)</Label>
            <Input id="draft-barcode" maxLength={160} value={editing.barcode} disabled={busy} onChange={e=>field("barcode",e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="draft-brand">Brand (optional)</Label>
            <Input id="draft-brand" maxLength={200} value={editing.brand} disabled={busy} onChange={e=>field("brand",e.target.value)}/></div>
        </div>
        <div className="space-y-1"><Label htmlFor="draft-description">Description (optional)</Label>
          <Textarea id="draft-description" maxLength={3000} rows={3} value={editing.description} disabled={busy} onChange={e=>field("description",e.target.value)}/></div>
        <p className="text-xs text-muted-foreground">
          Tax classification, inventory tracking rules and opening stock must be confirmed on the desktop before publication.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={()=>setEditing(null)}>Cancel</Button>
          <Button disabled={busy||!categories.length} onClick={()=>void save()}>{busy?"Saving…":"Save draft"}</Button>
        </div>
      </CardContent>
    </Card>}
    {discardId&&<Card><CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p className="text-sm">Discard this product draft? This cannot be undone.</p>
      <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={()=>setDiscardId(null)}>Keep draft</Button>
        <Button variant="destructive" disabled={busy} onClick={()=>void discard()}>{busy?"Discarding…":"Discard draft"}</Button></div>
    </CardContent></Card>}
    <Card>
      <CardHeader><CardTitle>Saved drafts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {loading?<p className="text-sm text-muted-foreground">Loading drafts…</p>:
          drafts.length===0?<p className="text-sm text-muted-foreground">No product drafts yet.</p>:
          drafts.map(draft=><div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0">
            <div>
              <p className="font-medium">{draft.name}</p>
              <p className="text-xs text-muted-foreground">{draft.sku} · {money(draft.selling_price_ugx)} · Draft only</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={()=>openDraft(draft)}><FilePenLine className="size-4"/>Edit</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={()=>setDiscardId(draft.id)}><Trash2 className="size-4"/>Discard</Button>
            </div>
          </div>)}
      </CardContent>
    </Card>
  </main>;
}
