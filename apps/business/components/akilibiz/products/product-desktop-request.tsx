"use client";

import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Saved={requestId:string;commandId?:string;state?:string};
export function ProductDesktopRequest({draftId}:{draftId:string}){
  const key=`akilibiz.product-request.${draftId}`;
  const [saved,setSaved]=useState<Saved|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    try{
      const raw=window.sessionStorage.getItem(key);
      if(raw){
        const value=JSON.parse(raw) as Saved;
        if(value && UUID.test(value.requestId) &&
          (!value.commandId || UUID.test(value.commandId)))setSaved(value);
      }
    }catch{/* Session storage may be unavailable. Never assume a request was not sent. */}
    setLoaded(true);
  },[key]);
  const persist=(value:Saved)=>{
    // Refuse the network request if its identity cannot survive a refresh.
    window.sessionStorage.setItem(key,JSON.stringify(value));
    setSaved(value);
  };
  const send=async()=>{
    if(!loaded||busy||saved?.commandId)return;
    setError(null);
    const requestId=saved?.requestId??crypto.randomUUID();
    try{persist({requestId});}
    catch{setError("Request recovery is unavailable in this browser.");return;}
    setBusy(true);
    try{
      const res=await fetch("/api/sync/product-creates",{
        method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({draftId,requestId}),
      });
      const body=await res.json() as {commandId?:string;error?:string};
      if(!res.ok||!body.commandId||!UUID.test(body.commandId))
        throw new Error(body.error??"Could not confirm the product request.");
      persist({requestId,commandId:body.commandId,state:"pending"});
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Request outcome is unknown. Retry with the same ID.");
    }finally{setBusy(false);}
  };
  const check=async()=>{
    if(!saved?.commandId||busy)return;
    setBusy(true);setError(null);
    try{
      const res=await fetch(`/api/sync/product-creates?id=${encodeURIComponent(saved.commandId)}`,
        {cache:"no-store"});
      const body=await res.json() as {state?:string;error?:string};
      if(!res.ok||!body.state)throw new Error(body.error??"Status unavailable.");
      persist({...saved,state:body.state});
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not check the request.");
    }finally{setBusy(false);}
  };
  return <div className="flex flex-col items-end gap-1">
    {saved?.commandId ? <>
      <span role="status" className="text-xs text-muted-foreground">
        {saved.state === "published" ? "Product published and synchronized" : `Request ${saved.state??"pending"} — not yet published`}
      </span>
      <Button size="sm" variant="outline" disabled={busy} onClick={()=>void check()}>
        {busy?"Checking…":"Check desktop request"}
      </Button>
    </>:<Button size="sm" variant="outline" disabled={busy||!loaded}
      onClick={()=>void send()}>
      {busy?"Requesting…":saved?"Retry same request":"Request desktop review"}
    </Button>}
    {error&&<span role="alert" className="max-w-sm text-right text-xs text-destructive">{error}</span>}
  </div>;
}
