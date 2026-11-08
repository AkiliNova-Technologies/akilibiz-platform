export type DocumentType = "RECEIPT" | "INVOICE";
export type DocumentStatus = "GENERATED" | "PRINTED" | "REPRINTED" | "CANCELLED" | "VOIDED";

export interface DocumentItem { name: string; sku: string; quantity: number; unit_price: number; discount: number; tax_rate: number | null; tax_amount: number; total: number; }
export interface DocumentData {
  document_number: string; document_type: DocumentType; date: string; cashier: string; currency: string;
  business: { name: string; address?: string | null; phone?: string | null; email?: string | null; tin?: string | null };
  customer?: { name: string; phone?: string | null } | null;
  items: DocumentItem[];
  totals: { subtotal: number; discount: number; taxable_amount?: number | null; tax: number; grand_total: number; amount_paid: number; change: number; balance: number };
  payment: { method: string; reference?: string | null }; notes?: string | null; footer?: string | null;
}
export interface BusinessDocument { id: string; document_number: string; document_type: DocumentType; source_type: string; source_id: number; status: DocumentStatus; data: DocumentData; created_at: string; updated_at: string; }
export interface DocumentPdf { filename: string; pdf_base64: string; }
export interface SalePrintLine { name:string; sku:string; quantity_milli:number|null; unit_price_ugx:number|null; discount_ugx:number|null; tax_amount_ugx:number|null; line_total_ugx:number|null; tax_classification:string|null; tax_rate_basis_points:number|null; tax_snapshot_tax_code:string|null; tax_snapshot_rate_basis_points:number|null; tax_snapshot_taxable_amount_ugx:number|null; tax_snapshot_tax_amount_ugx:number|null; tax_snapshot_rounding_method:string|null; }
export interface SalePrintDocument { document_type:string; sale_id:number; sale_number:string; status:string; reversal_status:string; created_at_utc:string; display_time_convention:string; business_name:string|null; cashier:string|null; customer_name:string|null; customer_phone:string|null; currency_code:string|null; subtotal_ugx:number|null; discount_ugx:number|null; tax_ugx:number|null; total_ugx:number|null; amount_paid_ugx:number|null; change_ugx:number|null; balance_due_ugx:number|null; cancelled_at_utc:string|null; cancellation_reason:string|null; lines:SalePrintLine[]; payments:{payment_method:string;amount_ugx:number|null;reference:string|null;created_at_utc:string}[]; }
