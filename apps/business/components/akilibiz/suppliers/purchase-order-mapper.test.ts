import {describe,expect,it} from "vitest";
import {mapHostedPurchaseOrder} from "./purchase-order-mapper";
import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

const row:FinancialMirrorRow={
  localRecordId:7,localBusinessPublicId:"desktop-a",
  capturedAt:"2026-11-14T15:00:00Z",
  record:{
    po_number:"PO-007",supplier_id:3,items_count:4,
    total_amount:250000,order_date:"2026-11-14",
    expected_delivery:"2026-11-17",status:"Pending",
    created_by_name_snapshot:"Administrator",notes:"Delivery in Kampala",
  },
};
describe("authoritative purchasing mirror mapping",()=>{
  it("maps an actual desktop purchase order without inventing supplier name",()=>{
    expect(mapHostedPurchaseOrder(row)).toEqual({
      id:7,po_number:"PO-007",supplier_id:3,
      supplier_name:"Supplier #3",items_count:4,total_amount:250000,
      order_date:"2026-11-14",expected_delivery:"2026-11-17",
      status:"Pending",created_by_name:"Administrator",
      notes:"Delivery in Kampala",
    });
  });
  it("rejects missing supplier IDs, fractional currency, unknown state and malformed date",()=>{
    for(const altered of [
      {supplier_id:null},
      {total_amount:250000.5},
      {status:"unrecognized"},
      {order_date:"not-a-date"},
      {items_count:1.5},
    ]){
      expect(mapHostedPurchaseOrder({...row,record:{...row.record,...altered}})).toBeNull();
    }
  });
  it("accepts only supported receiving and cancellation lifecycle statuses",()=>{
    for(const status of ["Draft","Pending","Partially Received","Received","Cancelled"]){
      expect(mapHostedPurchaseOrder({...row,record:{...row.record,status}})?.status).toBe(status);
    }
  });
});
