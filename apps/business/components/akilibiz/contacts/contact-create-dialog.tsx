"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { validateContactChanges } from "@/lib/contact-update-validation";

type Kind="customer"|"supplier";
const FIELD_CONFIG={
  customer:[
    {key:"name",label:"Customer name",required:true,max:200},
    {key:"email",label:"Email",required:false,max:320},
    {key:"phone",label:"Phone",required:false,max:40},
    {key:"address",label:"Address",required:false,max:1000},
  ],
  supplier:[
    {key:"name",label:"Supplier name",required:true,max:200},
    {key:"contact_person",label:"Contact person",required:true,max:200},
    {key:"phone",label:"Phone",required:true,max:40},
    {key:"email",label:"Email",required:false,max:320},
    {key:"address",label:"Address",required:false,max:1000},
    {key:"payment_terms",label:"Payment terms",required:true,max:200},
  ],
} as const;

export function ContactCreateDialog({
  entity,
  onClose,
}:{
  entity:Kind;
  onClose:()=>void;
}) {
  const router=useRouter();
  const config=FIELD_CONFIG[entity];
  const [fields,setFields]=React.useState<Record<string,string>>({});
  const [requestId]=React.useState(()=>crypto.randomUUID());
  const [commandId,setCommandId]=React.useState<string|null>(null);
  const [state,setState]=React.useState<"pending"|"applied"|"conflict"|null>(null);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);

  const submit=async()=>{
    if(busy||commandId)return;
    const values:Record<string,string|null>={};
    for(const field of config) {
      const value=(fields[field.key]??"").trim();
      if(field.required&&!value) {
        setError(`${field.label} is required.`);
        return;
      }
      values[field.key]=value||null;
    }
    const invalid=validateContactChanges(entity,values);
    if(invalid){setError(invalid);return;}
    setBusy(true);setError(null);
    try {
      const response=await fetch("/api/sync/contact-creates",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        cache:"no-store",
        body:JSON.stringify({entity,requestId,fields:values}),
      });
      const result=await response.json() as {commandId?:string;error?:string};
      if(!response.ok||!result.commandId) throw new Error(
        result.error??"Could not request contact creation."
      );
      setCommandId(result.commandId);
      setState("pending");
    }catch(cause){
      // Keep the same request ID for a retry after a lost network response.
      setError(cause instanceof Error?cause.message:"Could not request contact creation.");
    }finally{setBusy(false);}
  };

  const check=async()=>{
    if(!commandId||busy)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch(
        `/api/sync/contact-creates?id=${encodeURIComponent(commandId)}`,
        {cache:"no-store"},
      );
      const result=await response.json() as {
        state?:"pending"|"applied"|"conflict";error?:string;conflictReason?:string;
      };
      if(!response.ok||!result.state) throw new Error(
        result.error??"Could not check the request status."
      );
      setState(result.state);
      if(result.state==="applied") router.refresh();
      if(result.state==="conflict") setError(
        result.conflictReason??"Desktop could not create the contact. No record was overwritten."
      );
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not check creation status.");
    }finally{setBusy(false);}
  };

  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add {entity}</DialogTitle>
        <DialogDescription>
          Request a new contact in your paired AkiliBiz Desktop business.
          It will appear here after desktop approval and synchronization.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto px-0.5">
        {config.map(field=><div className="space-y-1" key={field.key}>
          <Label htmlFor={`create-${entity}-${field.key}`}>{field.label}</Label>
          <Input
            id={`create-${entity}-${field.key}`}
            maxLength={field.max}
            required={field.required}
            disabled={busy||!!commandId}
            value={fields[field.key]??""}
            onChange={event=>setFields(previous=>({...previous,[field.key]:event.target.value}))}
          />
        </div>)}
      </div>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      {state&&<p role="status" className="rounded-md border p-3 text-sm">
        {state==="pending"?"Waiting for the paired desktop. The contact is not yet created."
          :state==="applied"?"Created on the desktop. The directory updates after its next sync."
          :"The desktop rejected this creation request. Your existing contacts were unchanged."}
      </p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Close</Button>
        {!commandId?
          <Button type="button" disabled={busy} onClick={()=>void submit()}>
            {busy?"Submitting…":"Request creation"}
          </Button>:
          <Button type="button" variant="outline" disabled={busy} onClick={()=>void check()}>
            {busy?"Checking…":"Check status"}
          </Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
