"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadFinancialMirror, loadAllFinancialMirrorRows,
  type FinancialMirrorRow,
} from "@/components/akilibiz/finance/financial-mirror-client";
import { parseTaxSettings } from "@/components/akilibiz/settings/hosted-settings-contract";
import type { TaxSettingsFormData } from "@/components/akilibiz/settings/tax-settings-data";

/** Read-only evidence categories; not live URA balances or a tax filing API. */
export type TaxSection = "overview" | "products" | "purchases" | "imports" |
  "credits" | "reconciliation" | "preparation" | "efris";
export type TaxEvidence = {
  id: string;
  source: string;
  title: string;
  detail: string;
  date: string | null;
  status: string | null;
  amountUgx: number | null;
  productId?: number;
};
export type TaxView = {
  rows: TaxEvidence[];
  settings: TaxSettingsFormData | null;
  lastSync: string | null;
  sourceCounts: Record<string, number>;
};

const sources: Partial<Record<TaxSection, readonly string[]>> = {
  products: ["product_vat_reviews"],
  purchases: ["supplier_purchase_vat_evidence","supplier_input_vat_reviews","supplier_input_vat_reversals"],
  imports: ["import_vat_documents"],
  credits: ["vat_credit_evidence_events","vat_credit_evidence_corrections"],
  reconciliation: ["supplier_purchase_vat_evidence","supplier_input_vat_reviews",
    "supplier_input_vat_reversals","vat_credit_evidence_events","vat_credit_evidence_corrections"],
};
const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const money = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const date = (value: unknown): string | null =>
  str(value) && Number.isFinite(Date.parse(String(value))) ? String(value) : null;

const labels: Record<string, string> = {
  product_vat_reviews: "Product VAT review",
  supplier_purchase_vat_evidence: "Supplier VAT document",
  supplier_input_vat_reviews: "Input VAT review",
  supplier_input_vat_reversals: "Input VAT reversal",
  import_vat_documents: "Import document",
  vat_credit_evidence_events: "URA credit evidence",
  vat_credit_evidence_corrections: "URA evidence correction",
};

/** Only approved, known VAT fields enter the UI; never render raw document JSON. */
export function mapTaxEvidence(entity: string, row: FinancialMirrorRow): TaxEvidence {
  const r = row.record;
  if (!labels[entity] || !Number.isSafeInteger(row.localRecordId) || row.localRecordId < 1) {
    throw new Error("Unrecognized synchronized VAT evidence record.");
  }
  const v = (key: string) => str(r[key]);
  let title: string | null = null;
  let detail = "";
  let when: string | null = null;
  let status: string | null = null;
  let amount: number | null = null;
  switch (entity) {
    case "product_vat_reviews":
      title = v("classification_code");
      detail = `Product #${r.product_id} · ${r.tax_inclusive === 1 ? "VAT included" : "VAT not included"}`;
      when = date(r.confirmed_at);
      status = "Confirmed";
      if (r.tax_inclusive !== 0 && r.tax_inclusive !== 1) title = null;
      break;
    case "supplier_purchase_vat_evidence":
      title = v("supplier_invoice_number") ?? "Document not provided";
      detail = `Receipt #${r.goods_receipt_id} · ${v("source_kind") ?? "Unspecified source"}`;
      when = date(r.invoice_date) ?? date(r.recorded_at);
      status = v("review_status");
      amount = money(r.vat_charged_ugx);
      break;
    case "supplier_input_vat_reviews":
      title = `Receipt #${r.goods_receipt_id}`;
      detail = v("reason") ?? "";
      when = date(r.reviewed_on);
      status = v("decision");
      amount = money(r.approved_vat_ugx);
      break;
    case "supplier_input_vat_reversals":
      title = `Receipt #${r.goods_receipt_id}`;
      detail = v("reason") ?? "";
      when = date(r.reversed_on);
      status = "Reversed";
      amount = money(r.reversed_vat_ugx);
      break;
    case "import_vat_documents":
      title = v("customs_entry_reference");
      detail = v("import_description") ?? "";
      when = date(r.customs_entry_date);
      status = "Documented, not automatically claimed";
      amount = money(r.vat_documented_ugx);
      break;
    case "vat_credit_evidence_events":
      title = v("source_reference");
      detail = `VAT month: ${v("vat_month") ?? "Not recorded"}`;
      when = date(r.source_date);
      status = v("event_kind");
      amount = money(r.closing_credit_ugx);
      break;
    case "vat_credit_evidence_corrections":
      title = v("source_reference");
      detail = `Correction to credit record #${r.target_event_id}`;
      when = date(r.source_date);
      status = "Document correction";
      break;
  }
  // Fail closed on malformed evidence. Missing records do not equal zero VAT.
  if (!title || !when || !detail ||
      (amount === null && [
        "supplier_purchase_vat_evidence","supplier_input_vat_reviews",
        "supplier_input_vat_reversals","import_vat_documents","vat_credit_evidence_events",
      ].includes(entity))) {
    throw new Error(`A synchronized ${labels[entity]} record is incomplete. The section cannot be shown reliably.`);
  }
  return {id:`${entity}:${row.localRecordId}`, source:labels[entity],
    title,detail,date:when,status,amountUgx:amount,
    ...(entity==="product_vat_reviews" && typeof r.product_id==="number" &&
       Number.isSafeInteger(r.product_id) && r.product_id>0 ? {productId:r.product_id}:{}),
  };
}

export async function loadTaxSection(section: TaxSection): Promise<TaxView> {
  if (section === "preparation" || section === "efris") {
    return { rows: [], settings: null, lastSync: null, sourceCounts: {} };
  }
  if (section === "overview") {
    const [settings, configuration] = await Promise.all([
      loadFinancialMirror("tax_settings", {page:1,pageSize:2}),
      loadFinancialMirror("tax_configurations", {page:1,pageSize:2}),
    ]);
    if (settings.total !== 1 || configuration.total !== 1 ||
        settings.rows.length !== 1 || configuration.rows.length !== 1) {
      throw new Error("The business VAT settings snapshot is incomplete or has not synchronized.");
    }
    const parsed = parseTaxSettings(settings.rows[0].record,configuration.rows[0].record);
    if (!parsed) throw new Error("The synchronized VAT registration settings are invalid.");
    const synced = [settings.lastSuccessfulSync,configuration.lastSuccessfulSync]
      .filter((x):x is string=>Boolean(x)).sort();
    return {rows:[],settings:parsed,lastSync:synced[0]??null,sourceCounts:{}};
  }
  const selected=sources[section]??[];
  const groups=await Promise.all(selected.map(async entity => ({
    entity,rows:await loadAllFinancialMirrorRows(entity),
  })));
  const rows=groups.flatMap(group=>group.rows.map(row=>mapTaxEvidence(group.entity,row)));
  rows.sort((a,b)=>(b.date??"").localeCompare(a.date??""));
  return {rows,settings:null,lastSync:null,
    sourceCounts:Object.fromEntries(groups.map(group=>[group.entity,group.rows.length]))};
}

export function useTaxManagement(section: TaxSection) {
  const [view,setView]=useState<TaxView|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const sequence=useRef(0);
  const refresh=useCallback(async()=>{
    const id=++sequence.current;
    setLoading(true);setError(null);
    try {
      const next=await loadTaxSection(section);
      if(id===sequence.current) setView(next);
    } catch(reason) {
      if(id===sequence.current) {
        setView(null);
        setError(reason instanceof Error?reason.message:"VAT records could not be loaded.");
      }
    } finally {
      if(id===sequence.current) setLoading(false);
    }
  },[section]);
  useEffect(()=>{
    void Promise.resolve().then(refresh);
    return ()=>{sequence.current++;};
  },[refresh]);
  return {view,loading,error,refresh};
}
