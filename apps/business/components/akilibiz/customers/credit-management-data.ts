"use client";

import { useCallback } from "react";
import type { CustomerCreditRow, PurchasePaymentMethod } from "./customers-data";

export interface CreditSale {
  id:number;
  sale_number:string;
  customer_id:number;
  balance_due:number;
  status:"completed"|"cancelled";
}
export interface SalePaymentHistoryEntry {
  id:number;
  payment_date:string;
  amount:number;
  payment_method:PurchasePaymentMethod;
  payment_reference?:string|null;
  remaining_balance:number;
}
export interface RecordSalePaymentPayload {
  amount:number;
  payment_method:PurchasePaymentMethod;
  payment_reference?:string|null;
  notes?:string|null;
  idempotency_key?:string|null;
}

// Credit details require a reconciled source ledger. Do not seed fake balances,
// invent invoices, or report in-memory payment changes as posted.
const EMPTY_ACCOUNTS:CustomerCreditRow[]=[];
const EMPTY_SALES:CreditSale[]=[];
const EMPTY_PAYMENTS:SalePaymentHistoryEntry[]=[];
export function useCreditManagementData(){
  const getCreditAccounts=useCallback(async()=>EMPTY_ACCOUNTS,[]);
  const getSales=useCallback(async()=>EMPTY_SALES,[]);
  const getSalePaymentHistory=useCallback(async(_customerId:number,_saleId:number)=>EMPTY_PAYMENTS,[]);
  const recordSalePayment=useCallback(async(
    _saleId:number,_payload:RecordSalePaymentPayload
  ):Promise<CreditSale|null>=>null,[]);
  return {
    creditAccounts:EMPTY_ACCOUNTS,
    loading:false,
    sales:EMPTY_SALES,
    getCreditAccounts,getSales,getSalePaymentHistory,recordSalePayment,
  };
}
