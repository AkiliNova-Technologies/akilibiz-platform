import { describe, expect, it } from "vitest";
import {
  CONTACTS_PAGE_SIZE,
  contactDirectoryHref,
  contactPageCount,
  contactSearchPattern,
  parseContactDirectoryQuery,
} from "./contact-directory-query";

describe("hosted contacts pagination", () => {
  it("defaults to a safe first page and trims searches", () => {
    expect(parseContactDirectoryQuery({})).toEqual({ page: 1, search: "" });
    expect(parseContactDirectoryQuery({ page: "0", q: "  Fred  " }))
      .toEqual({ page: 1, search: "Fred" });
    expect(parseContactDirectoryQuery({ page: "-7", q: ["ignored"] }))
      .toEqual({ page: 1, search: "" });
    expect(parseContactDirectoryQuery({ page: "9999999" }).page).toBe(1);
  });
  it("bounds a search and preserves legitimate page values", () => {
    expect(parseContactDirectoryQuery({ page: "29", q: "x".repeat(200) }))
      .toEqual({ page: 29, search: "x".repeat(100) });
    expect(contactPageCount(0)).toBe(1);
    expect(contactPageCount(CONTACTS_PAGE_SIZE)).toBe(1);
    expect(contactPageCount(CONTACTS_PAGE_SIZE + 1)).toBe(2);
  });
  it("escapes literal LIKE wildcard input", () => {
    expect(contactSearchPattern("A%_\\B")).toBe("%A\\%\\_\\\\B%");
  });
  it("preserves search across pages and encodes URL safely", () => {
    expect(contactDirectoryHref("customers", 1, "")).toBe("/dashboard/customers");
    expect(contactDirectoryHref("suppliers", 2, "Acme & Sons"))
      .toBe("/dashboard/suppliers?q=Acme+%26+Sons&page=2");
  });
});
