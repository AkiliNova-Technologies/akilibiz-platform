import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";
import type {PurchaseOrder,PurchaseOrderStatus} from "./purchase-orders-data";

const states=new Set<PurchaseOrderStatus>([
  "Draft","Pending","Partially Received","Received","Cancelled",
]);
const whole=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?v:null;
const text=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const date=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}/.test(v)&&
  !Number.isNaN(Date.parse(v))?v.slice(0,10):null;

/** Only faithfully mapped desktop purchase orders enter the web register. */
export function mapHostedPurchaseOrder(row:FinancialMirrorRow):PurchaseOrder|null{
  const r=row.record;
  const id=whole(row.localRecordId),supplierId=whole(r.supplier_id);
  const exactQuantity=whole(r.items_count_milli);
  const legacyQuantity=typeof r.items_count==="number"&&
    Number.isFinite(r.items_count)&&r.items_count>=0&&
    Number.isSafeInteger(Math.round(r.items_count*1000))&&
    Math.abs(r.items_count*1000-Math.round(r.items_count*1000))<1e-6
      ?Math.round(r.items_count*1000)/1000:null;
  const items=exactQuantity!==null?exactQuantity/1000:legacyQuantity;
  const total=whole(r.total_amount_ugx??r.total_amount);
  const number=text(r.po_number),orderDate=date(r.order_date);
  const status=r.status;
  if(id===null||id<=0||supplierId===null||supplierId<=0||
    items===null||total===null||!number||!orderDate||
    typeof status!=="string"||!states.has(status as PurchaseOrderStatus)||
    (r.expected_delivery!=null&&date(r.expected_delivery)===null)||
    typeof row.localBusinessPublicId!=="string"||!row.localBusinessPublicId.trim())return null;
  return {
    id,po_number:number,supplier_id:supplierId,
    // Desktop mirror supplies local supplier ID, not its name. Do not invent a join.
    supplier_name:text(r.supplier_name_snapshot)??`Supplier #${supplierId}`,
    items_count:items,total_amount:total,order_date:orderDate,
    expected_delivery:date(r.expected_delivery)??"",
    status:status as PurchaseOrderStatus,
    created_by_name:text(r.created_by_name_snapshot)??"Desktop staff",
    notes:text(r.notes)??undefined,
    source_business_public_id:row.localBusinessPublicId,
  };
}
