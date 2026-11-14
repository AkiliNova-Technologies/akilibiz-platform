import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { contactSearchPattern } from "@/lib/contact-directory-query";
import { CATALOGUE_PAGE_SIZE, cataloguePageCount, cataloguePageParams } from "@/lib/catalogue-query";
import {
  HostedCatalogue, type HostedCategoryRow, type HostedProductRow,
} from "@/components/akilibiz/products/hosted-catalogue";

type StockSnapshot = { product_id:string; on_hand_milli:number|null; is_current:boolean };
type Search = { page?:string|string[]; q?:string|string[] };

export async function HostedCataloguePage({
  view,
  searchParams,
}:{
  view:"products"|"categories";
  searchParams?:Search;
}) {
  const business=await requireActiveBusiness();
  const supabase=await createClient();
  const {page:requestedPage,search}=cataloguePageParams(searchParams??{});
  const categoriesResult=await supabase.from("desktop_categories")
    .select("id,name,slug,description,is_active,local_category_id",{count:"exact"})
    .eq("business_id",business.id)
    .order("local_category_id")
    .range(0,999);
  const categoryOverflow=(categoriesResult.count??0)>1000;
  let countQuery=supabase.from("desktop_products")
    .select("id",{count:"exact",head:true})
    .eq("business_id",business.id);
  if(view==="products"&&search)countQuery=countQuery.ilike("name",contactSearchPattern(search));
  const countResult=await countQuery;
  const total=countResult.count??0;
  const page=Math.min(requestedPage,cataloguePageCount(total));
  let productQuery=supabase.from("desktop_products")
    .select("id,name,sku,category_id,barcode,brand,stock_unit,selling_price_ugx,cost_price_ugx,is_active")
    .eq("business_id",business.id);
  if(view==="products"&&search)productQuery=productQuery.ilike("name",contactSearchPattern(search));
  const productResult=await productQuery.order("id",{ascending:true})
    .range(view==="products"?(page-1)*CATALOGUE_PAGE_SIZE:0,
      view==="products"?page*CATALOGUE_PAGE_SIZE-1:999);
  const tooManyForCategoryView=view==="categories"&&total>1000;
  const {data:positions,error:stockError}=view==="products"
    ? await supabase.rpc("list_desktop_effective_inventory",{target_business_id:business.id})
    : {data:[] as StockSnapshot[],error:null};
  const error=categoriesResult.error||countResult.error||productResult.error||categoryOverflow||tooManyForCategoryView
    ? categoryOverflow||tooManyForCategoryView
      ? "This catalogue is larger than the category summary can safely display. Use the Products directory for paginated results."
      : "Could not load your products and categories. Check your connection and try again."
    : null;
  const current=new Map<string,number|null>(
    (!stockError?(positions??[]) as StockSnapshot[]:[])
      .filter(position=>position.is_current)
      .map(position=>[position.product_id,position.on_hand_milli]),
  );
  const productRows=(error?[]:productResult.data??[]).map(product=>({
    ...product,
    stock_quantity:current.has(product.id)?current.get(product.id)??null:null,
  }));
  return <HostedCatalogue
    businessName={business.name}
    error={error}
    stockError={stockError?"Current stock quantities could not be loaded.":null}
    categories={(error?[]:categoriesResult.data??[]) as HostedCategoryRow[]}
    products={productRows as HostedProductRow[]}
    pagination={view==="products"?{page,total,search}:undefined}
    draftsEnabled={process.env.AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS === "1"}
    view={view}
  />;
}
