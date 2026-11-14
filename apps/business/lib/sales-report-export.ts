import {csvSafeCell} from "@/lib/contact-export";

export type SaleRegisterExportRow={
  sale_number:string;sale_date_utc:string;customer_name:string|null;
  total_amount_ugx:number;amount_paid_ugx:number;
  balance_due_ugx:number;tax_amount_ugx:number;
  status:string;reversal_status:string;
};
const fields=[
  "sale_number","sale_date_utc","customer_name","total_amount_ugx",
  "amount_paid_ugx","balance_due_ugx","tax_amount_ugx","status",
  "reversal_status",
] as const;

/** Export only the already verified, period-filtered owner-scoped register. */
export function salesReportCsv(rows:readonly SaleRegisterExportRow[]):string{
  return [
    fields.map(csvSafeCell).join(","),
    ...rows.map(row=>fields.map(field=>csvSafeCell(row[field])).join(",")),
  ].join("\r\n")+"\r\n";
}
