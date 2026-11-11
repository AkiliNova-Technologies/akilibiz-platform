"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxProductReviewList } from "@/components/akilibiz/finance/tax-product-review-list";
import { useTaxManagement, type TaxSection, type TaxEvidence } from "@/components/akilibiz/finance/tax-management-data";

const sections = [
  {id:"overview",label:"Overview"},
  {id:"products",label:"Product VAT"},
  {id:"purchases",label:"Purchase VAT"},
  {id:"imports",label:"Import documents"},
  {id:"credits",label:"URA credit records"},
  {id:"reconciliation",label:"Reconciliation"},
  {id:"preparation",label:"Return preparation"},
  {id:"efris",label:"EFRIS integration"},
] as const;

const guidance = [
  {title:"Standard VAT rate",value:"18%",
    copy:"The general standard rate is 18%. Check whether a particular supply is zero-rated, exempt or outside VAT. The historic effective date of this rate is not asserted here."},
  {title:"Zero-rated supplies",value:"0%",
    copy:"Zero-rated supplies are taxable at 0%. Eligibility depends on applicable law and the circumstances of each supply."},
  {title:"Exempt supplies",value:"Reference",
    copy:"Exempt is not the same as zero-rated. The exemption must be supported by the applicable legal schedule and factual circumstances."},
  {title:"Outside the scope of VAT",value:"Reference",
    copy:"This treatment differs from zero-rating and exemption. Do not infer tax treatment from a product name or missing classification."},
  {title:"Annual VAT registration threshold",value:"UGX 300,000,000",
    copy:"The desktop reference catalogue identifies this threshold effective 1 July 2026. Confirm current registration requirements and business eligibility with URA."},
] as const;

const guidanceSources: Record<string, {publisher:string;url:string}[]> = {
  "Standard VAT rate": [{publisher:"Uganda Revenue Authority",url:"https://ura.go.ug/en/value-added-tax-vat/"}],
  "Zero-rated supplies": [
    {publisher:"Uganda Legal Information Institute",url:"https://ulii.org/en/akn/ug/act/statute/1996/8/eng%402024-12-23"},
    {publisher:"Uganda Revenue Authority",url:"https://ura.go.ug/en/value-added-tax-vat/"},
  ],
  "Exempt supplies": [
    {publisher:"Uganda Legal Information Institute",url:"https://ulii.org/en/akn/ug/act/statute/1996/8/eng%402024-12-23"},
    {publisher:"Uganda Revenue Authority",url:"https://ura.go.ug/en/value-added-tax-vat/"},
  ],
  "Outside the scope of VAT": [{publisher:"Uganda Revenue Authority",url:"https://ura.go.ug/en/value-added-tax-vat/"}],
  "Annual VAT registration threshold": [
    {publisher:"Uganda Gazette (republished by ULII)",url:"https://ulii.org/en/akn/ug/act/2026/14/eng%402026-06-05"},
    {publisher:"Uganda Revenue Authority",url:"https://ura.go.ug/en/revised-value-added-tax-registration-threshold/"},
  ],
};

const money = (value:number) => `UGX ${value.toLocaleString("en-UG")}`;

function EvidenceRegister({rows,empty}:{rows:TaxEvidence[];empty:string}) {
  if(rows.length===0)return <p role="status" className="rounded-lg border p-4 text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-2">
    {rows.map(row=><div key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="text-sm font-medium">{row.title}</h4>
        <p className="text-xs text-muted-foreground">{row.detail}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{row.source}</span>
          {row.date&&<span>{row.date.slice(0,10)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {row.status&&<Badge variant="outline">{row.status.replaceAll("_"," ")}</Badge>}
        {row.amountUgx!==null&&<strong className="text-sm tabular-nums">{money(row.amountUgx)}</strong>}
      </div>
    </div>)}
  </div>;
}

function TaxSectionContent({section,viewRows}:{section:TaxSection;viewRows:TaxEvidence[]}) {
  if(section==="products")return <TaxProductReviewList reviews={viewRows}/>;
  if(section==="purchases")return <>
    <div>
      <h2 className="text-lg font-semibold">Review supplier input VAT</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Check invoice evidence, eligibility reviews and reversals. A supplier invoice
        does not automatically establish recoverable input VAT.
      </p>
    </div>
    <EvidenceRegister rows={viewRows} empty="No supplier VAT documents or review decisions have been received for this business."/>
  </>;
  if(section==="imports")return <>
    <div>
      <h2 className="text-lg font-semibold">Import VAT documents</h2>
      <p className="mt-1 text-sm text-muted-foreground">Keep a record of VAT shown on customs bills of entry. Recording documents does not verify them with customs, claim input VAT or change your accounts.</p>
    </div>
    <div className="space-y-2 border-t pt-4">
      <h3 className="text-sm font-semibold">Recorded customs documents</h3>
      <EvidenceRegister rows={viewRows} empty="No customs VAT documents have been received for this business."/>
    </div>
  </>;
  if(section==="credits") {
    const credits=viewRows.filter(row=>row.source==="URA credit evidence");
    const latest=credits[0];
    return <>
      <div>
        <h2 className="text-lg font-semibold">URA VAT credit records</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review documented opening credits, filed monthly returns and adjustments. These are staff-recorded document details, not balances independently verified with URA.</p>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Latest credit shown on a recorded document</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {latest?.amountUgx!==null&&latest?.amountUgx!==undefined?money(latest.amountUgx):"Not recorded"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">No automatic carryforward, URA verification, payment or refund claim occurs.</p>
      </div>
      <div className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Recorded supporting documents and corrections</h3>
        <EvidenceRegister rows={viewRows} empty="No URA credit evidence has been recorded for this business."/>
      </div>
    </>;
  }
  if(section==="reconciliation")return <>
    <div>
      <h2 className="text-lg font-semibold">VAT reconciliation</h2>
      <p className="mt-1 text-sm text-muted-foreground">Review the available purchase VAT evidence, input VAT approvals, reversals and documented URA credit history.</p>
    </div>
    <EvidenceRegister rows={viewRows} empty="No VAT supporting records have been received for reconciliation."/>
    <p className="rounded-lg border p-3 text-xs text-muted-foreground">These are supporting records, not a calculated VAT payable or an approved tax return. </p>
  </>;
  if(section==="preparation")return <>
    <h2 className="text-lg font-semibold">VAT return working paper</h2>
    <p className="text-sm text-muted-foreground">Prepare an internal monthly summary for comparison with URA records. This is not a URA return template, filing, tax assessment or verified credit claim.</p>
  </>;
  return <>
    <h2 className="text-lg font-semibold">EFRIS integration readiness</h2>
    <p className="text-sm text-muted-foreground">Review integration requirements and readiness.</p>
  </>;
}

export default function FinanceTaxManagementPage(){
  const [tab,setTab]=useState<TaxSection>("overview");
  const {view,loading,error}=useTaxManagement(tab);
  return <main className="flex min-w-0 flex-1 flex-col gap-5 pb-6">
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tax Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage VAT reviews and documents, then check the records behind your monthly figures.</p>
      </div>
      <Button asChild variant="outline"><Link href="/dashboard/settings/tax">VAT settings <ArrowUpRight className="ml-2 size-4"/></Link></Button>
    </div>
    <Tabs value={tab} onValueChange={value=>setTab(value as TaxSection)}>
      <div className="min-w-0 overflow-x-auto pb-1" aria-label="Tax management sections">
        <TabsList className="h-auto min-w-max justify-start gap-1 rounded-full! bg-card p-1.5 shadow-none">
          {sections.map(section=><TabsTrigger key={section.id} value={section.id}
            className="h-9 rounded-full! border-0 bg-transparent px-4 py-2 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:rounded-full! data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:font-medium data-[state=active]:text-primary-foreground">{section.label}</TabsTrigger>)}
        </TabsList>
      </div>
      <TabsContent value="overview" className="pt-3">
        <Card><CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Uganda VAT reference</h2>
            <Badge variant="outline">Reference guidance</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Reference information only. Product treatment and registration must follow your business records and applicable URA requirements.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {guidance.map(item=><div key={item.title} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <Badge variant="outline">{item.value}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.copy}</p>
              {item.title==="Annual VAT registration threshold"&&<p className="text-xs text-muted-foreground">Effective from 2026-07-01</p>}
              <div className="flex flex-wrap gap-3">
                {(guidanceSources[item.title]??[]).map(source=>
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary underline underline-offset-2">{source.publisher}</a>)}
              </div>
            </div>)}
          </div>
          <p className="text-xs text-muted-foreground">AkiliBiz does not automatically submit tax returns, verify URA balances or grant refunds. Consult current URA and Uganda legislation before filing.</p>
        </CardContent></Card>
      </TabsContent>
      {sections.filter(section=>section.id!=="overview").map(section=>
        <TabsContent value={section.id} key={section.id} className="pt-3">
          <Card><CardContent className="space-y-4 p-4 sm:p-6">
            {tab===section.id&&loading&&<p role="status" className="text-sm text-muted-foreground">Loading {section.label.toLocaleLowerCase()}…</p>}
            {tab===section.id&&error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
            {tab===section.id&&!loading&&!error&&<TaxSectionContent section={section.id} viewRows={view?.rows??[]}/>}
          </CardContent></Card>
        </TabsContent>)}
    </Tabs>
  </main>;
}
