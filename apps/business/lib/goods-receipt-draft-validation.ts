/**
 * Web goods-receipt preparation only. The desktop remains the authority for
 * posted inventory, supplier payable balances and Uganda VAT evidence.
 */
export type PreparedReceiptLine = {
  purchase_order_line_id: number;
  product_id: number;
  quantity_milli: number;
  unit_cost_ugx: number;
};

export type PreparedSupplierInvoice = {
  source_kind: "EFRIS_E_INVOICE" | "TAX_INVOICE";
  invoice_number: string;
  invoice_date: string;
  evidence_reference: string;
  supplier_tin: string | null;
  declared_vat_ugx: number;
  lines: Array<{
    product_id: number;
    classification_code: "STANDARD_RATED" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE";
    tax_inclusive: boolean;
  }>;
};

export type PreparedGoodsReceipt = {
  id: string;
  source_business_public_id: string;
  purchase_order_id: number;
  receipt_number: string;
  receipt_date: string;
  supplier_reference: string | null;
  due_date: string | null;
  lines: PreparedReceiptLine[];
  supplier_vat: PreparedSupplierInvoice | null;
};

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
const whole = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const positive = (value: unknown): value is number => whole(value) && value > 0;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (row: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(row).length === expected.length &&
  Object.keys(row).every(key => expected.includes(key));
const string = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 &&
  value.length <= max && !/[\u0000-\u001f]/.test(value);
const optionalText = (value: unknown, max: number) =>
  value === null || (typeof value === "string" && value.length <= max &&
    !/[\u0000-\u001f]/.test(value));

export function receiptLineTotal(line: PreparedReceiptLine): number | null {
  if (!positive(line.quantity_milli) || !whole(line.unit_cost_ugx)) return null;
  const scaled = line.quantity_milli * line.unit_cost_ugx;
  if (!Number.isSafeInteger(scaled) || scaled % 1000 !== 0) return null;
  return scaled / 1000;
}

export function preparedReceiptTotal(lines: readonly PreparedReceiptLine[]): number | null {
  let total = 0;
  for (const line of lines) {
    const amount = receiptLineTotal(line);
    if (amount === null) return null;
    total += amount;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}

export function parsePreparedGoodsReceipt(value: unknown): PreparedGoodsReceipt | null {
  if (!object(value) || !exactKeys(value, [
    "id","source_business_public_id","purchase_order_id","receipt_number",
    "receipt_date","supplier_reference","due_date","lines","supplier_vat",
  ])) return null;
  if (typeof value.id !== "string" || !uuidV4.test(value.id) ||
    !string(value.source_business_public_id,128) ||
    !positive(value.purchase_order_id) ||
    !string(value.receipt_number,100) || !date(value.receipt_date) ||
    !optionalText(value.supplier_reference,160) ||
    (value.due_date !== null && (!date(value.due_date) || value.due_date < value.receipt_date)) ||
    !Array.isArray(value.lines) || value.lines.length === 0 || value.lines.length > 100) return null;
  const lines: PreparedReceiptLine[] = [];
  const seen = new Set<number>();
  const products = new Set<number>();
  for (const item of value.lines) {
    if (!object(item) || !exactKeys(item,[
      "purchase_order_line_id","product_id","quantity_milli","unit_cost_ugx",
    ]) || !positive(item.purchase_order_line_id) || !positive(item.product_id) ||
      !positive(item.quantity_milli) || !whole(item.unit_cost_ugx) ||
      seen.has(item.purchase_order_line_id) || products.has(item.product_id)) return null;
    const line: PreparedReceiptLine = {
      purchase_order_line_id:item.purchase_order_line_id,
      product_id:item.product_id,
      quantity_milli:item.quantity_milli,
      unit_cost_ugx:item.unit_cost_ugx,
    };
    if (receiptLineTotal(line) === null) return null;
    seen.add(line.purchase_order_line_id);
    products.add(line.product_id);
    lines.push(line);
  }
  if (preparedReceiptTotal(lines) === null) return null;
  let supplier_vat: PreparedSupplierInvoice | null = null;
  if (value.supplier_vat !== null) {
    const vat = value.supplier_vat;
    if (!object(vat) || !exactKeys(vat,[
      "source_kind","invoice_number","invoice_date","evidence_reference",
      "supplier_tin","declared_vat_ugx","lines",
    ]) || !["EFRIS_E_INVOICE","TAX_INVOICE"].includes(String(vat.source_kind)) ||
      !string(vat.invoice_number,100) || !date(vat.invoice_date) ||
      !string(vat.evidence_reference,160) || !optionalText(vat.supplier_tin,100) ||
      !whole(vat.declared_vat_ugx) || !Array.isArray(vat.lines) ||
      vat.lines.length !== lines.length) return null;
    const treatments: PreparedSupplierInvoice["lines"] = [];
    for (let i = 0; i < vat.lines.length; i++) {
      const item = vat.lines[i];
      if (!object(item) || !exactKeys(item,["product_id","classification_code","tax_inclusive"]) ||
        item.product_id !== lines[i].product_id ||
        !["STANDARD_RATED","ZERO_RATED","EXEMPT","OUT_OF_SCOPE"].includes(String(item.classification_code)) ||
        typeof item.tax_inclusive !== "boolean") return null;
      treatments.push({
        product_id:lines[i].product_id,
        classification_code:item.classification_code as PreparedSupplierInvoice["lines"][number]["classification_code"],
        tax_inclusive:item.tax_inclusive,
      });
    }
    supplier_vat = {
      source_kind:vat.source_kind as PreparedSupplierInvoice["source_kind"],
      invoice_number:(vat.invoice_number as string).trim(),
      invoice_date:vat.invoice_date as string,
      evidence_reference:(vat.evidence_reference as string).trim(),
      supplier_tin:vat.supplier_tin as string | null,
      declared_vat_ugx:vat.declared_vat_ugx as number,
      lines:treatments,
    };
  }
  return {
    id:value.id,
    source_business_public_id:value.source_business_public_id as string,
    purchase_order_id:value.purchase_order_id as number,
    receipt_number:(value.receipt_number as string).trim(),
    receipt_date:value.receipt_date,
    supplier_reference:value.supplier_reference as string | null,
    due_date:value.due_date as string | null,
    lines,supplier_vat,
  };
}
