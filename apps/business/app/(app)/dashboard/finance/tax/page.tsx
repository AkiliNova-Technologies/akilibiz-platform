"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, FileText, Landmark, Receipt, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sections = [
  { id: "overview", label: "Overview", title: "Uganda VAT reference", description: "Review tax guidance and the records used for VAT preparation." },
  { id: "products", label: "Product VAT", title: "Product VAT review", description: "Review product tax classifications and VAT treatment." },
  { id: "purchases", label: "Purchase VAT", title: "Purchase VAT review", description: "Review supplier invoices and input VAT eligibility." },
  { id: "imports", label: "Import documents", title: "Import VAT evidence", description: "Review import declarations and supporting tax documents." },
  { id: "credits", label: "URA credit records", title: "URA credit evidence", description: "Review supporting records for VAT credits and adjustments." },
  { id: "reconciliation", label: "Reconciliation", title: "VAT reconciliation", description: "Compare purchase, sales and supporting VAT evidence." },
  { id: "preparation", label: "Return preparation", title: "VAT return working paper", description: "Prepare figures for review before filing with URA." },
  { id: "efris", label: "EFRIS integration", title: "EFRIS integration readiness", description: "Review integration requirements and connection status." },
] as const;

type SectionId = (typeof sections)[number]["id"];

const icons = {
  overview: Landmark,
  products: Receipt,
  purchases: Receipt,
  imports: FileText,
  credits: FileCheck2,
  reconciliation: ShieldCheck,
  preparation: FileText,
  efris: ShieldCheck,
};

export default function FinanceTaxManagementPage() {
  const [tab, setTab] = useState<SectionId>("overview");
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 pb-6">
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage VAT reviews and documents, then check the records behind your monthly figures.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings/tax">VAT settings <ArrowUpRight className="size-4" /></Link>
        </Button>
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value as SectionId)}>
        <div className="min-w-0 overflow-x-auto pb-1" aria-label="Tax management sections">
          <TabsList className="h-auto min-w-max justify-start gap-1 rounded-full! bg-card p-1.5 shadow-none">
            {sections.map((section) => (
              <TabsTrigger key={section.id} value={section.id}
                className="h-9 rounded-full! border-0 bg-transparent px-4 py-2 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:rounded-full! data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:font-medium data-[state=active]:text-primary-foreground">
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {sections.map((section) => {
          const Icon = icons[section.id];
          return (
            <TabsContent key={section.id} value={section.id} className="pt-3">
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="size-5 text-muted-foreground" />
                    <h2 className="font-semibold">{section.title}</h2>
                    <Badge variant="outline">Not connected</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                  <p role="status" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    {section.id === "overview"
                      ? "Uganda VAT guidance has not been loaded from the desktop reference service. Verify current rates, thresholds and eligibility with URA before using them."
                      : "This section requires the hosted tax records and review service. No entries or balances are available yet."}
                  </p>
                  {section.id === "overview" ? (
                    <p className="text-xs text-muted-foreground">
                      AkiliBiz does not automatically submit tax returns, verify URA balances or grant refunds.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
