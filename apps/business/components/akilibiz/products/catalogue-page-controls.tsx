import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CATALOGUE_PAGE_SIZE,
  cataloguePageCount,
  cataloguePageHref,
} from "@/lib/catalogue-query";

export type CataloguePagination = { page:number; total:number; search:string };

export function CataloguePageControls({pagination}: {pagination:CataloguePagination}) {
  const {page,total,search}=pagination;
  const pages=cataloguePageCount(total);
  const first=total===0?0:(page-1)*CATALOGUE_PAGE_SIZE+1;
  const last=Math.min(total,page*CATALOGUE_PAGE_SIZE);
  return <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end sm:justify-between">
    <form action="/dashboard/products" method="get" className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
      <label htmlFor="catalogue-server-search" className="text-sm font-medium">Search products</label>
      <div className="flex gap-2">
        <input id="catalogue-server-search" name="q" type="search"
          defaultValue={search} maxLength={100} placeholder="Search all product names"
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"/>
        <Button size="sm" type="submit" variant="outline">Search</Button>
        {search&&<Button size="sm" asChild variant="ghost"><Link href="/dashboard/products">Clear</Link></Button>}
      </div>
    </form>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{first}–{last} of {total.toLocaleString("en-UG")} products</span>
      {page>1?<Button size="sm" asChild variant="outline"><Link href={cataloguePageHref(page-1,search)}>Previous</Link></Button>:
        <Button size="sm" variant="outline" disabled>Previous</Button>}
      <span className="tabular-nums">Page {page} of {pages}</span>
      {page<pages?<Button size="sm" asChild variant="outline"><Link href={cataloguePageHref(page+1,search)}>Next</Link></Button>:
        <Button size="sm" variant="outline" disabled>Next</Button>}
    </div>
  </div>;
}
