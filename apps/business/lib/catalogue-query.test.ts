import { describe,expect,it } from "vitest";
import { CATALOGUE_PAGE_SIZE,cataloguePageParams,cataloguePageCount,cataloguePageHref } from "./catalogue-query";

describe("hosted catalogue paging",()=>{
  it("defaults to the first page and trims search",()=>{
    expect(cataloguePageParams({})).toEqual({page:1,search:""});
    expect(cataloguePageParams({page:"0",q:"  Coffee  "})).toEqual({page:1,search:"Coffee"});
    expect(cataloguePageParams({page:"-4"}).page).toBe(1);
    expect(cataloguePageParams({page:"9999999"}).page).toBe(1);
    expect(cataloguePageParams({page:"2",q:"x".repeat(300)}).search).toHaveLength(100);
  });
  it("bounds page counts and preserves all-search URL",()=>{
    expect(CATALOGUE_PAGE_SIZE).toBe(50);
    expect(cataloguePageCount(0)).toBe(1);
    expect(cataloguePageCount(51)).toBe(2);
    expect(cataloguePageHref(1,"")).toBe("/dashboard/products");
    expect(cataloguePageHref(3,"Rice & beans"))
      .toBe("/dashboard/products?q=Rice+%26+beans&page=3");
  });
});
