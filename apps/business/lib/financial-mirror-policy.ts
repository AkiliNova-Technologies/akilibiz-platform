export const FINANCIAL_MIRROR_ENTITIES = new Set([
  "sales", "sale_items", "sale_payments", "supplier_payments", "supplier_payables",
  "supplier_payment_allocations", "purchase_orders", "purchase_order_lines",
  "goods_receipts", "goods_receipt_lines", "finance_transactions", "authoritative_expenses",
  "expense_payables", "expense_settlements", "expense_tax_evidence",
  "authoritative_financial_events", "journal_entries", "journal_lines",
  "chart_of_accounts", "tax_settings", "tax_configurations", "receipt_settings",
  "product_vat_reviews", "supplier_purchase_vat_evidence",
  "supplier_input_vat_reviews", "supplier_input_vat_reversals",
  "import_vat_documents", "vat_credit_evidence_events",
  "vat_credit_evidence_corrections",
]);

export const canReadFinancialMirrors = (role: string) => role === "owner";

export function financialMirrorPagination(pageValue: string | null, pageSizeValue: string | null) {
  const requestedPage = Number(pageValue ?? "1");
  const requestedPageSize = Number(pageSizeValue ?? "50");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Number.isInteger(requestedPageSize) ? Math.min(Math.max(requestedPageSize, 1), 100) : 50;
  return { page, pageSize, from: (page - 1) * pageSize };
}
