import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

export interface GoodsReceiptLine {
  id:number;
  product_id:number;
  quantity_milli:number;
  unit_cost_ugx:number;
  line_total_ugx:number;
  purchase_order_line_id:number|null;
}
const amount=(value:unknown)=>typeof value==="number"&&
  Number.isSafeInteger(value)&&value>=0?value:null;
const id=(value:unknown)=>{const n=amount(value);return n!==null&&n>0?n:null;};

/** Explicitly source-scoped. SQLite receipt IDs are not globally unique. */
export function verifyGoodsReceiptLines(
  receipt:{id:number;source_business_public_id:string;total_amount_ugx:number},
  rows:FinancialMirrorRow[],
):GoodsReceiptLine[]{
  if(!receipt.source_business_public_id.trim())
    throw new Error("The originating desktop business is unknown.");
  const lines:GoodsReceiptLine[]=[];
  const seen=new Set<number>();
  for(const row of rows){
    if(row.localBusinessPublicId!==receipt.source_business_public_id||
      row.record.goods_receipt_id!==receipt.id)continue;
    const r=row.record;
    const lineId=id(row.localRecordId),productId=id(r.product_id);
    const qty=id(r.quantity_milli),price=amount(r.unit_cost_ugx);
    const total=amount(r.line_total_ugx);
    const poLine=r.purchase_order_line_id==null?null:id(r.purchase_order_line_id);
    if(!lineId||!productId||!qty||price===null||total===null||
      (r.purchase_order_line_id!=null&&!poLine)||
      (r.currency_code!==undefined&&r.currency_code!=="UGX")||
      seen.has(lineId))throw new Error("Synchronized goods receipt lines are invalid.");
    const scaled=qty*price;
    if(!Number.isSafeInteger(scaled)||scaled%1000!==0||scaled/1000!==total)
      throw new Error("A goods receipt item amount does not reconcile.");
    seen.add(lineId);
    lines.push({
      id:lineId,product_id:productId,quantity_milli:qty,
      unit_cost_ugx:price,line_total_ugx:total,purchase_order_line_id:poLine,
    });
  }
  if(!lines.length)
    throw new Error("Goods receipt items have not synchronized.");
  const sum=lines.reduce((value,line)=>value+line.line_total_ugx,0);
  if(!Number.isSafeInteger(sum)||sum!==receipt.total_amount_ugx)
    throw new Error("Goods receipt items do not match the recorded total.");
  return lines.sort((a,b)=>a.id-b.id);
}
