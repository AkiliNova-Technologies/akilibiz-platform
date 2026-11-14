export type PurchaseOrderDraftLine={
  product_id:string;
  quantity_milli:number;
  unit_price_ugx:number;
};
export type PurchaseOrderDraftInput={
  id:string;po_number:string;supplier_id:string;source_business_public_id:string;
  order_date:string;expected_delivery:string|null;notes:string|null;
  lines:PurchaseOrderDraftLine[];
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date=(s:unknown):s is string=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const exact=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const keys=(value:Record<string,unknown>,expected:string[])=>Object.keys(value).length===expected.length&&
  Object.keys(value).every(key=>expected.includes(key));

/** Exactly representable milliquantities and whole-UGX line totals. */
export function purchaseOrderLineTotal(line:PurchaseOrderDraftLine):number|null{
  if(!exact(line.quantity_milli)||line.quantity_milli<=0||
    !exact(line.unit_price_ugx))return null;
  const scaled=line.quantity_milli*line.unit_price_ugx;
  if(!Number.isSafeInteger(scaled)||scaled%1000!==0)return null;
  const total=scaled/1000;
  return Number.isSafeInteger(total)?total:null;
}
export function purchaseOrderDraftTotal(lines:readonly PurchaseOrderDraftLine[]):number|null{
  let sum=0;
  for(const line of lines){
    const amount=purchaseOrderLineTotal(line);
    if(amount===null)return null;
    sum+=amount;
    if(!Number.isSafeInteger(sum))return null;
  }
  return sum;
}
export function parsePurchaseOrderDraft(value:unknown):PurchaseOrderDraftInput|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const data=value as Record<string,unknown>;
  const expected=["id","po_number","supplier_id","source_business_public_id","order_date",
    "expected_delivery","notes","lines"];
  if(!keys(data,expected)||typeof data.id!=="string"||!uuidV4.test(data.id)||
    typeof data.supplier_id!=="string"||!uuid.test(data.supplier_id)||
    typeof data.source_business_public_id!=="string"||
    data.source_business_public_id.length<1||
    data.source_business_public_id.length>128||
    /[\u0000-\u001f]/.test(data.source_business_public_id)||
    typeof data.po_number!=="string"||!data.po_number.trim()||
    data.po_number.length>100||/[\u0000-\u001f]/.test(data.po_number)||
    !date(data.order_date)||
    (data.expected_delivery!==null&&(!date(data.expected_delivery)||
      data.expected_delivery<data.order_date))||
    (data.notes!==null&&(typeof data.notes!=="string"||data.notes.length>2000||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(data.notes)))||
    !Array.isArray(data.lines)||data.lines.length===0||data.lines.length>100)return null;
  const products=new Set<string>();
  const lines:PurchaseOrderDraftLine[]=[];
  for(const value of data.lines){
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    const row=value as Record<string,unknown>;
    if(!keys(row,["product_id","quantity_milli","unit_price_ugx"])||
      typeof row.product_id!=="string"||!uuid.test(row.product_id)||
      products.has(row.product_id.toLowerCase())||
      !exact(row.quantity_milli)||row.quantity_milli<=0||
      !exact(row.unit_price_ugx))return null;
    const line={product_id:row.product_id,quantity_milli:row.quantity_milli as number,
      unit_price_ugx:row.unit_price_ugx as number};
    if(purchaseOrderLineTotal(line)===null)return null;
    products.add(row.product_id.toLowerCase());
    lines.push(line);
  }
  if(purchaseOrderDraftTotal(lines)===null)return null;
  return {id:data.id,po_number:data.po_number.trim(),supplier_id:data.supplier_id,
    source_business_public_id:data.source_business_public_id,
    order_date:data.order_date,expected_delivery:data.expected_delivery as string|null,
    notes:typeof data.notes==="string"?data.notes.trim()||null:null,lines};
}
