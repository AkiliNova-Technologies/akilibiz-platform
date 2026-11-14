"use client";

import {useCallback,useState} from "react";
import {loadAllFinancialMirrorRows,type FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";
import {dateWithinRange} from "./sales-report-validation";
import {verifyGoodsReceiptLines} from "./goods-receipt-detail";

export interface GoodsReceivedRegisterRow {
  id:number;receipt_number:string;receipt_date_utc:string;
  status:"posted"|"voided";supplier_name:string;
  total_amount_ugx:number;tax_amount_ugx:number;currency_code:"UGX";
  reversal_status:string;purchase_order_id?:number;
  source_business_public_id:string;
}
export interface PurchasingReportQuery{
  date_from?:string;date_to?:string;skip?:number;limit?:number;
}
const nonnegative=(value:unknown):number|null=>
  typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?value:null;
const positive=(value:unknown):number|null=>{
  const n=nonnegative(value);return n!==null&&n>0?n:null;
};
export function mapGoodsReceived(row:FinancialMirrorRow):GoodsReceivedRegisterRow|null{
  const r=row.record;
  const id=positive(row.localRecordId);
  const supplierId=positive(r.supplier_id);
  const total=nonnegative(r.total_amount_ugx);
  const tax=nonnegative(r.tax_amount_ugx);
  const date=typeof r.receipt_date==="string"?r.receipt_date:null;
  const name=typeof r.receipt_number==="string"?r.receipt_number.trim():"";
  if(!id||!supplierId||!name||total===null||tax===null||
    !date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
    Number.isNaN(Date.parse(date))||
    (r.status!=="posted"&&r.status!=="voided")||
    (r.currency_code!==undefined&&r.currency_code!=="UGX")||
    typeof row.localBusinessPublicId!=="string"||!row.localBusinessPublicId.trim())return null;
  const orderId=r.purchase_order_id==null?undefined:positive(r.purchase_order_id);
  if(r.purchase_order_id!=null&&orderId===null)return null;
  return {
    id,receipt_number:name,receipt_date_utc:date,status:r.status,
    supplier_name:`Supplier #${supplierId}`,
    total_amount_ugx:total,tax_amount_ugx:tax,currency_code:"UGX",
    reversal_status:r.status==="voided"?"voided":"not_reversed",
    purchase_order_id:orderId??undefined,
    source_business_public_id:row.localBusinessPublicId,
  };
}

export function useReportsPurchasingData(){
  const [goodsReceived,setGoodsReceived]=useState<GoodsReceivedRegisterRow[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const getGoodsReceivedRegister=useCallback(async(query:PurchasingReportQuery)=>{
    setLoading(true);setError(null);
    try{
      const mirror=await loadAllFinancialMirrorRows("goods_receipts");
      const records=mirror.map(mapGoodsReceived);
      const omitted=records.filter(row=>row===null).length;
      const valid=records.filter((row):row is GoodsReceivedRegisterRow=>row!==null);
      const filtered=valid.filter(row=>dateWithinRange(row.receipt_date_utc,query.date_from,query.date_to));
      const skip=Math.max(0,query.skip??0);
      const limit=Math.max(0,query.limit??filtered.length);
      const visible=filtered.slice(skip,skip+limit);
      setGoodsReceived(visible);
      if(omitted)setError(`${omitted} goods receipts were omitted because exact VAT or receipt details were unavailable.`);
      return visible;
    }catch(cause){
      setGoodsReceived([]);
      setError(cause instanceof Error?cause.message:"Synchronized goods-received report is unavailable.");
      return [];
    }finally{setLoading(false);}
  },[]);
  const getGoodsReceiptLines=useCallback(async(receipt:GoodsReceivedRegisterRow)=>{
    const rows=await loadAllFinancialMirrorRows("goods_receipt_lines");
    return verifyGoodsReceiptLines(receipt,rows);
  },[]);
  return {goodsReceived,getGoodsReceivedRegister,getGoodsReceiptLines,loading,error};
}
