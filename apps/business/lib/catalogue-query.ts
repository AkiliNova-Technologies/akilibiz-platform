export const CATALOGUE_PAGE_SIZE = 50;

export function cataloguePageParams(input: {
  page?: string | string[];
  q?: string | string[];
}) {
  const value = typeof input.page === "string" ? input.page : "";
  const page = /^[1-9][0-9]{0,5}$/.test(value) ? Number(value) : 1;
  return {
    page,
    search: typeof input.q === "string" ? input.q.trim().slice(0,100) : "",
  };
}

export function cataloguePageCount(total:number) {
  return Math.max(1,Math.ceil(total/CATALOGUE_PAGE_SIZE));
}
export function cataloguePageHref(page:number,search:string) {
  const params=new URLSearchParams();
  if(search) params.set("q",search);
  if(page>1) params.set("page",String(page));
  return `/dashboard/products${params.size?`?${params.toString()}`:""}`;
}
