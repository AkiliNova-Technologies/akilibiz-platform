import { describe, expect, it } from "vitest";
import { mapTaxEvidence } from "./tax-management-data";
import type { FinancialMirrorRow } from "./financial-mirror-client";

const row = (record: Record<string,unknown>): FinancialMirrorRow => ({
  localRecordId: 15,
  capturedAt: "2026-11-11T08:00:00Z",
  record,
});

describe("tax read-only mirror evidence mapping", () => {
  it("shows documented supplier VAT without presenting it as a recoverable credit", () => {
    expect(mapTaxEvidence("supplier_purchase_vat_evidence",row({
      goods_receipt_id: 3, supplier_invoice_number: "TAX-3",
      source_kind: "EFRIS_E_INVOICE", review_status: "NEEDS_ELIGIBILITY_REVIEW",
      invoice_date: "2026-11-10", vat_charged_ugx: 1800,
    }))).toMatchObject({
      source:"Supplier VAT document",title:"TAX-3",
      status:"NEEDS_ELIGIBILITY_REVIEW",amountUgx:1800,
    });
  });
  it("separates an input VAT decision from the original supplier document", () => {
    expect(mapTaxEvidence("supplier_input_vat_reviews",row({
      goods_receipt_id:3,reason:"Required checks have been completed",
      reviewed_on:"2026-11-11",decision:"DEFER",approved_vat_ugx:0,
    }))).toMatchObject({status:"DEFER",amountUgx:0});
  });
  it("keeps documentary URA credit evidence distinct from authoritative balances", () => {
    expect(mapTaxEvidence("vat_credit_evidence_events",row({
      source_reference:"URA-2026-11",vat_month:"2026-11",
      source_date:"2026-11-10",event_kind:"OPENING",closing_credit_ugx:2700,
    }))).toMatchObject({
      source:"URA credit evidence",amountUgx:2700,status:"OPENING",
    });
  });
  it("does not manufacture a record from malformed values", () => {
    expect(()=>mapTaxEvidence("import_vat_documents",row({
      customs_entry_reference:"IMP-1",import_description:"Goods",
      customs_entry_date:"2026-11-11",vat_documented_ugx:-500,
    }))).toThrow("incomplete");
    expect(()=>mapTaxEvidence("invalid_entity",row({}))).toThrow("Unrecognized");
  });
  it("preserves product review confirmation without guessing a VAT percentage", () => {
    expect(mapTaxEvidence("product_vat_reviews",row({
      classification_code:"ZERO_RATED",product_id:7,
      tax_inclusive:0,confirmed_at:"2026-11-11T10:00:00Z",
    }))).toMatchObject({title:"ZERO_RATED",amountUgx:null,status:"Confirmed"});
  });
});
