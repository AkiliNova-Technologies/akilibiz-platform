"use client";

import {useCallback,useState} from "react";
import {loadAllFinancialMirrorRows} from "@/components/akilibiz/finance/financial-mirror-client";
import {mapPurchaseOrderLines,mapPurchaseOrderReceipts,verifyOrderLinesTotal} from "./purchase-order-detail";
import {mapHostedPurchaseOrder} from "./purchase-order-mapper";

export type PurchaseOrderStatus="Draft"|"Pending"|"Partially Received"|"Received"|"Cancelled";
export interface PurchaseOrder {
  id:number;po_number:string;supplier_id:number;supplier_name:string;
  items_count:number;total_amount:number;order_date:string;
  expected_delivery:string;status:PurchaseOrderStatus;created_by_name:string;
  notes?:string;
  source_business_public_id:string;
}
const unavailable=():never=>{
  throw new Error("Purchase order creation and goods receipt posting are not yet available on the web.");
};
export function usePurchaseOrdersData(){
  const [orders,setOrders]=useState<PurchaseOrder[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const getOrders=useCallback(async()=>{
    setLoading(true);
    setError(null);
    try{
      const rows=await loadAllFinancialMirrorRows("purchase_orders");
      const parsed=rows.map(mapHostedPurchaseOrder);
      const invalid=parsed.filter(row=>row===null).length;
      // Local IDs are valid only within one desktop business; reject
      // collisions rather than combining different source records.
      const sources=new Map<number,string>();
      for(const row of rows){
        const source=row.localBusinessPublicId??"";
        const previous=sources.get(row.localRecordId);
        if(previous!==undefined&&previous!==source)
          throw new Error("Multiple desktop sources have overlapping purchase order IDs. This register needs source-specific selection.");
        sources.set(row.localRecordId,source);
      }
      const valid=parsed.filter((row):row is PurchaseOrder=>row!==null);
      setOrders(valid);
      if(invalid)setError(`${invalid} purchase orders were omitted because their synchronized details were incomplete.`);
      return valid;
    }catch(cause){
      setOrders([]);
      setError(cause instanceof Error?cause.message:"Could not load synchronized purchase orders.");
      return [];
    }finally{setLoading(false);}
  },[]);
  const getOrderDetail=useCallback(async(order:PurchaseOrder)=>{
    if(!order.source_business_public_id) throw new Error("Purchase order source is unavailable.");
    const [lineRows,receiptRows]=await Promise.all([
      loadAllFinancialMirrorRows("purchase_order_lines"),
      loadAllFinancialMirrorRows("goods_receipts"),
    ]);
    const source={id:order.id,localBusinessPublicId:order.source_business_public_id};
    const lines=mapPurchaseOrderLines(source,lineRows);
    const receipts=mapPurchaseOrderReceipts(source,receiptRows);
    const linesReconciled=verifyOrderLinesTotal(order.total_amount,lines);
    // Missing legacy lines are not mistaken for a verified empty order.
    if(lines.length>0&&!linesReconciled)
      throw new Error("Purchase order items do not reconcile with the recorded order total.");
    return {lines,receipts,linesReconciled};
  },[]);
  const addOrder=useCallback(async(_order:Omit<PurchaseOrder,"id"|"supplier_name"|"created_by_name"|"source_business_public_id">&{supplier_name:string}):Promise<never>=>unavailable(),[]);
  const editOrder=useCallback(async(_id:number,_payload:Partial<PurchaseOrder>):Promise<never>=>unavailable(),[]);
  const markReceived=useCallback(async(_id:number):Promise<never>=>unavailable(),[]);
  return {
    orders,loading,error,getOrders,getOrderDetail,
    getSummary:async()=>null,
    addOrder,editOrder,markReceived,
    getOrder:async(id:number)=>orders.find(row=>row.id===id)??null,
  };
}
