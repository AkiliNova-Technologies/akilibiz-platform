"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaxEvidence } from "./tax-management-data";
import { indexLatestProductVatReviews, productVatReviewKey } from "./tax-review-matching";

type Product = {
  id:string;
  local_business_public_id:string;
  local_product_id:number;
  name:string;
  sku:string;
  is_active:boolean;
};
const PAGE_SIZE=12;

export function TaxProductReviewList({reviews}: {reviews:TaxEvidence[]}) {
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [typed,setTyped]=useState("");
  const [search,setSearch]=useState("");
  const [includeReviewed,setIncludeReviewed]=useState(false);
  const [offset,setOffset]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/tax/product-review-catalogue",{
      cache:"no-store",signal:controller.signal,
    }).then(async response=>{
      const result=await response.json() as {products?:Product[];error?:string};
      if(!response.ok || !Array.isArray(result.products))
        throw new Error(result.error??"Products could not be loaded.");
      if(!controller.signal.aborted) {setProducts(result.products);setError(null);}
    }).catch((cause:unknown)=>{
      if(!controller.signal.aborted)
        setError(cause instanceof Error?cause.message:"The product list could not be loaded.");
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[]);
  const latest=useMemo(()=>indexLatestProductVatReviews(reviews),[reviews]);
  const filtered=useMemo(()=>products.filter(p=>{
    if(!includeReviewed && latest.has(productVatReviewKey(p.local_business_public_id,p.local_product_id)))return false;
    const term=search.toLocaleLowerCase();
    return !term||p.name.toLocaleLowerCase().includes(term)||p.sku.toLocaleLowerCase().includes(term);
  }),[includeReviewed,latest,products,search]);
  const items=filtered.slice(offset,offset+PAGE_SIZE);
  const selectedProduct=products.find(p=>p.id===selected);
  const selectedReview=selectedProduct?latest.get(productVatReviewKey(selectedProduct.local_business_public_id,selectedProduct.local_product_id)):null;
  return <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Review product VAT treatments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Check which products have a recorded VAT review. AkiliBiz does not guess
        treatment from a product&apos;s name or category.
      </p>
    </div>
    <form className="flex flex-wrap items-end gap-2" onSubmit={event=>{
      event.preventDefault();setSearch(typed.trim());setOffset(0);
    }}>
      <div className="min-w-44 flex-1 space-y-1">
        <Label htmlFor="product-vat-search">Find a product</Label>
        <Input id="product-vat-search" placeholder="Product name or SKU"
          maxLength={100} value={typed} onChange={event=>setTyped(event.target.value)}/>
      </div>
      <Button variant="outline" type="submit">Search</Button>
    </form>
    <div className="flex items-center gap-2">
      <Checkbox id="include-reviewed" checked={includeReviewed} onCheckedChange={value=>{
        setIncludeReviewed(value===true);setOffset(0);
      }}/>
      <Label htmlFor="include-reviewed">Include already reviewed products</Label>
    </div>
    <p className="text-xs text-muted-foreground">
      VAT confirmation can only be recorded in the desktop app. An absent review
      snapshot does not prove that the product has no VAT classification.
    </p>
    {loading&&<p role="status" className="text-sm text-muted-foreground">Loading products…</p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {!loading&&!error&&items.length===0&&<p className="rounded-lg border p-4 text-sm text-muted-foreground">
      {includeReviewed?"No products match your search.":"No products awaiting a synchronized VAT review match your search."}
    </p>}
    <div className="space-y-2">
      {items.map(p=>{
        const review=latest.get(productVatReviewKey(p.local_business_public_id,p.local_product_id));
        return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" key={p.id}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border px-2 py-0.5">
                {review?"Review recorded":"No confirmation received"}
              </span>
              <span className="text-muted-foreground">{review?.title??"Current treatment cannot be verified on the web"}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={()=>setSelected(p.id)}>
            {review?"View review":"View details"}
          </Button>
        </div>;
      })}
    </div>
    {!loading&&!error&&filtered.length>PAGE_SIZE&&<div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{offset+1}–{Math.min(filtered.length,offset+PAGE_SIZE)} of {filtered.length}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-PAGE_SIZE))}>Previous</Button>
        <Button variant="outline" size="sm" disabled={offset+PAGE_SIZE>=filtered.length} onClick={()=>setOffset(offset+PAGE_SIZE)}>Next</Button>
      </div>
    </div>}
    {selectedProduct&&<div className="rounded-lg border p-4" role="region" aria-label="Product VAT review details">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-semibold">{selectedProduct.name}</h3>
        <p className="text-xs text-muted-foreground">{selectedProduct.sku}</p></div>
        <Button variant="outline" size="sm" onClick={()=>setSelected(null)}>Close</Button>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {selectedReview?<>
          <p><strong>Recorded classification:</strong> {selectedReview.title}</p>
          <p><strong>Confirmed on:</strong> {selectedReview.date?.slice(0,10)??"Date unavailable"}</p>
          <p>{selectedReview.detail}</p>
        </>:<p>No confirmed VAT review was received in the current desktop snapshot.</p>}
        <p className="text-muted-foreground">To confirm or change a treatment, use the desktop Product VAT review.</p>
      </div>
    </div>}
  </div>;
}
