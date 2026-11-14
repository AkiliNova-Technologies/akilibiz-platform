import type { FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";
import type { SaleListResponse } from "@/components/akilibiz/sales-history/sales-history-data";

/** A payment register records the cash tendered, not just net revenue. */
const money=(value:unknown):number|null=>
  typeof value==="number" && Number.isSafeInteger(value) && value>=0 ? value:null;
const signed=(value:unknown):number|null=>
  typeof value==="number" && Number.isSafeInteger(value) ? value:null;

export type SalePaymentOutcome={paid:number;change:number;balance:number};

export function verifiedSalePaymentOutcome(
  sale:Pick<SaleListResponse,"total_amount"|"payment_method">,
  source:FinancialMirrorRow,
):SalePaymentOutcome|null{
  const record=source.record;
  const paid=money(record.amount_paid_ugx??record.amount_paid);
  const change=money(record.change_amount_ugx??record.change_amount);
  const recordedBalance=signed(record.balance_due_ugx??record.balance_due);
  if(paid===null||recordedBalance===null||change===null)return null;
  const expectedChange=Math.max(0,paid-sale.total_amount);
  const expectedBalance=Math.max(0,sale.total_amount-paid);
  const historicalCashBalance=
    sale.payment_method==="cash" && paid>sale.total_amount &&
    recordedBalance===sale.total_amount-paid;
  if(change!==expectedChange||
    (recordedBalance!==expectedBalance&&!historicalCashBalance))return null;
  return {paid,change,balance:expectedBalance};
}

export const dateWithinRange=(timestamp:string,from?:string,to?:string)=>
  (!from||timestamp.slice(0,10)>=from)&&(!to||timestamp.slice(0,10)<=to);
