export type ProductDraftInput = {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  barcode: string | null;
  brand: string | null;
  description: string | null;
  stock_unit: string;
  cost_price_ugx: number;
  selling_price_ugx: number;
};

const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseProductDraft(value:unknown):ProductDraftInput|null {
  if(!value || typeof value!=="object" || Array.isArray(value)) return null;
  const row=value as Record<string,unknown>;
  const expected=["id","name","sku","category_id","barcode","brand","description","stock_unit","cost_price_ugx","selling_price_ugx"];
  if(Object.keys(row).length!==expected.length ||
    Object.keys(row).some(key=>!expected.includes(key))) return null;
  if(typeof row.id!=="string"||!uuidV4.test(row.id)||
     typeof row.category_id!=="string"||!uuid.test(row.category_id)) return null;
  const limits={name:200,sku:160,stock_unit:40} as const;
  for(const [key,max] of Object.entries(limits)) {
    const field=row[key];
    if(typeof field!=="string"||!field.trim()||field.length>max||
      /[\u0000-\u001f]/.test(field))return null;
  }
  const optional={barcode:160,brand:200,description:3000} as const;
  for(const [key,max] of Object.entries(optional)) {
    const field=row[key];
    if(field!==null &&
      (typeof field!=="string"||field.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(field))) return null;
  }
  for(const key of ["cost_price_ugx","selling_price_ugx"]) {
    const amount=row[key];
    if(typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<0)return null;
  }
  return {
    id:row.id as string,
    name:(row.name as string).trim(),sku:(row.sku as string).trim(),
    category_id:row.category_id as string,
    barcode:(row.barcode as string|null)?.trim()||null,
    brand:(row.brand as string|null)?.trim()||null,
    description:(row.description as string|null)?.trim()||null,
    stock_unit:(row.stock_unit as string).trim(),
    cost_price_ugx:row.cost_price_ugx as number,
    selling_price_ugx:row.selling_price_ugx as number,
  };
}
