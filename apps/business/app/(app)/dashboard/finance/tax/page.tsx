"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, FileText, Landmark, Receipt,
  ShieldCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaxManagement, type TaxSection } from "@/components/akilibiz/finance/tax-management-data";

const sections = [
  { id: "overview", label: "Overview", title: "VAT configuration", description: "VAT registration information synchronized from the desktop." },
  { id: "products", label: "Product VAT", title: "Product VAT reviews", description: "Confirmed VAT treatment and classification reviews." },
  { id: "purchases", label: "Purchase VAT", title: "Supplier VAT documents and reviews", description: "Supplier evidence, eligibility decisions and reversals." },
  { id: "imports", label: "Import documents", title: "Import VAT evidence", description: "Customs entry documents recorded on the desktop." },
  { id: "credits", label: "URA credit records", title: "URA credit evidence", description: "Staff-recorded VAT carryforward documents and corrections. Not verified URA balances." },
  { id: "reconciliation", label: "Reconciliation", title: "VAT supporting records", description: "Evidence available to support a desktop VAT reconciliation." },
  { id: "preparation", label: "Return preparation", title: "VAT return preparation", description: "Return working papers and filing remain desktop-only." },
  { id: "efris", label: "EFRIS integration", title: "EFRIS readiness", description: "No live EFRIS verification or URA submission is enabled." },
] as const;

const icons = {
  overview: Landmark, products: Receipt, purchases: Receipt, imports: FileText,
  credits: FileCheck2, reconciliation: ShieldCheck, preparation: FileText, efris: ShieldCheck,
};
const fmt = (n:number)=>`UGX ${new Intl.NumberFormat("en-UG",{maximumFractionDigits:0}).format(n)}`;

export default function FinanceTaxManagementPage() {
  const [tab,setTab] = useState<TaxSection>("overview");
  const {view,loading,error,refresh} = useTaxManagement(tab);
  const unsupported=tab==="preparation"||tab==="efris";
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 pb-6">
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review VAT records received from your desktop business. All information is read-only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={()=>void refresh()} disabled={loading||unsupported}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings/tax">VAT settings <ArrowUpRight className="size-4" /></Link>
          </Button>
        </div>
      </div>
      <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
        The desktop remains the source of tax records. This page does not file returns,
        confirm URA balances, determine VAT recoverability or change any historical tax facts.
      </p>
      <Tabs value={tab} onValueChange={value=>setTab(value as TaxSection)}>
        <div className="min-w-0 overflow-x-auto pb-1" aria-label="Tax management sections">
          <TabsList className="h-auto min-w-max justify-start gap-1 rounded-full! bg-card p-1.5 shadow-none">
            {sections.map(section=>(
              <TabsTrigger key={section.id} value={section.id}
                className="h-9 rounded-full! border-0 bg-transparent px-4 py-2 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:rounded-full! data-[state=active]:bg-primary data-[state=active]:font-medium data-[state=active]:text-primary-foreground">
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {sections.map(section=>{
          const Icon=icons[section.id];
          const active=tab===section.id;
          return (
            <TabsContent key={section.id} value={section.id} className="pt-3">
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <Icon className="size-5 text-muted-foreground" /> {section.title}
                    </h2>
                    <Badge variant="outline">{unsupported?"Desktop-only":"Synchronized · read-only"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                  {active && loading && <p role="status" className="text-sm text-muted-foreground">Loading synchronized VAT records…</p>}
                  {active && error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
                  {active && !loading && !error && unsupported && (
                    <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      This feature has no qualified hosted read model yet. Continue using the desktop
                      application for VAT return working papers and EFRIS readiness checks.
                    </p>
                  )}
                  {active && !loading && !error && tab==="overview" && view?.settings && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["VAT registration",view.settings.vat_registered?"Registered":"Not registered"],
                        ["VAT registration number",view.settings.vat_registration_number||"Not recorded"],
                        ["Business TIN",view.settings.tax_number||"Not recorded"],
                        ["Tax label",view.settings.default_tax_name],
                        ["Show VAT on receipts",view.settings.show_tax_on_receipt?"Yes":"No"],
                        ["Latest snapshot",view.lastSync?new Date(view.lastSync).toLocaleString("en-UG"):"Date unavailable"],
                      ].map(([label,value])=>(
                        <div key={label} className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {active && !loading && !error && !unsupported && tab!=="overview" && (
                    <>
                      {tab==="reconciliation" && (
                        <p className="text-sm text-muted-foreground">
                          This register lists supporting evidence only. It is not a calculated
                          VAT payable, recoverable credit or completed return reconciliation.
                        </p>
                      )}
                      {view && Object.keys(view.sourceCounts).length>0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.values(view.sourceCounts).reduce((sum,n)=>sum+n,0)} synchronized evidence records available across {Object.keys(view.sourceCounts).length} source registers.
                        </p>
                      )}
                      {!view?.rows.length ? (
                        <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No synchronized records are available for this section. This does not
                          establish that no records exist on the desktop. Check Desktop sync and refresh.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="border-b bg-muted/40 text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3 font-medium">Record</th>
                                <th className="px-4 py-3 font-medium">Source / details</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 text-right font-medium">Documented UGX</th>
                              </tr>
                            </thead>
                            <tbody>
                              {view.rows.map(row=>(
                                <tr key={row.id} className="border-b last:border-0">
                                  <td className="px-4 py-3 font-medium">{row.title}</td>
                                  <td className="px-4 py-3">
                                    <p>{row.source}</p>
                                    <p className="text-xs text-muted-foreground">{row.detail}</p>
                                  </td>
                                  <td className="px-4 py-3">{row.status??"Not recorded"}</td>
                                  <td className="px-4 py-3">{row.date?.slice(0,10)??"—"}</td>
                                  <td className="px-4 py-3 text-right tabular-nums">
                                    {row.amountUgx===null?"—":fmt(row.amountUgx)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
