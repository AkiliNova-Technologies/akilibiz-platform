"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Contact = {
  id:string;
  updated_at:string;
  name:string;
  contact_person?:string;
  phone:string|null;
  email:string|null;
  address:string|null;
  payment_terms?:string;
};
const fields = {
  customer: [
    {key:"name",label:"Customer name",required:true,max:200},
    {key:"email",label:"Email",required:false,max:320},
    {key:"phone",label:"Phone",required:false,max:40},
    {key:"address",label:"Address",required:false,max:1000},
  ],
  supplier: [
    {key:"name",label:"Supplier name",required:true,max:200},
    {key:"contact_person",label:"Contact person",required:true,max:200},
    {key:"phone",label:"Phone",required:true,max:40},
    {key:"email",label:"Email",required:false,max:320},
    {key:"address",label:"Address",required:false,max:1000},
    {key:"payment_terms",label:"Payment terms",required:true,max:200},
  ],
} as const;

export function ContactEditDialog({ contact, entity, onClose }: {
  contact:Contact;entity:"customer"|"supplier";onClose:()=>void;
}) {
  const config=fields[entity] as readonly {
    key:string;label:string;required:boolean;max:number;
  }[];
  const [values,setValues]=useState<Record<string,string>>(
    Object.fromEntries(config.map(f=>[f.key,String(contact[f.key as keyof Contact]??"")]))
  );
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [commandId,setCommandId]=useState<string|null>(null);
  const [state,setState]=useState<"pending"|"applied"|"conflict"|null>(null);

  const save=async()=>{
    setError(null);
    const changes:Record<string,string|null>={};
    for(const field of config){
      const current=values[field.key]?.trim()??"";
      if(field.required && !current){
        setError(`${field.label} is required.`);return;
      }
      const previous=contact[field.key as keyof Contact]??"";
      if(current!==previous) changes[field.key]=current||null;
    }
    if(!Object.keys(changes).length){setError("No changes to save.");return;}
    setSaving(true);
    try {
      const response=await fetch("/api/sync/contact-updates",{
        method:"POST",headers:{"Content-Type":"application/json"},
        cache:"no-store",
        body:JSON.stringify({
          entity,recordId:contact.id,expectedUpdatedAt:contact.updated_at,changes,
        }),
      });
      const result=await response.json() as {
        commandId?:string;error?:string;state?:string;
      };
      if(!response.ok||!result.commandId)throw new Error(
        result.error??"The change could not be queued."
      );
      setCommandId(result.commandId);setState("pending");
    } catch(cause){
      setError(cause instanceof Error?cause.message:"Could not queue the contact update.");
    } finally {setSaving(false);}
  };
  const check=async()=>{
    if(!commandId)return;
    setSaving(true);setError(null);
    try{
      const response=await fetch(
        `/api/sync/contact-updates?id=${encodeURIComponent(commandId)}`,
        {cache:"no-store"});
      const result=await response.json() as {
        state?: "pending"|"applied"|"conflict";error?:string;conflictReason?:string;
      };
      if(!response.ok||!result.state)throw new Error(
        result.error??"Could not read the update status."
      );
      setState(result.state);
      if(result.state==="conflict")setError(
        result.conflictReason??"The desktop record changed. Review and retry with fresh data."
      );
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not check update status.");
    }finally{setSaving(false);}
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit {entity==="customer"?"customer":"supplier"}</DialogTitle>
        <DialogDescription>
          Save a change request for your desktop. Records update only after
          desktop validation and synchronization.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto px-0.5">
        {config.map(field=><div className="space-y-1" key={field.key}>
          <Label htmlFor={`contact-edit-${field.key}`}>{field.label}</Label>
          <Input id={`contact-edit-${field.key}`} maxLength={field.max}
            required={field.required} disabled={commandId!==null||saving}
            value={values[field.key]??""}
            onChange={event=>setValues(previous=>({
              ...previous,[field.key]:event.target.value,
            }))}/>
        </div>)}
      </div>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      {state&&<p role="status" className="rounded-md border p-3 text-sm">
        {state==="pending"
          ?"Queued for the paired desktop. It has not been applied yet."
          : state==="applied"
          ?"Applied on the desktop. Refresh the directory after the next outbound sync."
          :"Conflict: the desktop version was changed. No edit was overwritten."}
      </p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        {!commandId
          ?<Button disabled={saving} onClick={()=>void save()}>
            {saving?"Queueing…":"Queue changes"}
          </Button>
          :<Button variant="outline" disabled={saving} onClick={()=>void check()}>
            {saving?"Checking…":"Check status"}
          </Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
