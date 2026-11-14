/** Strictly bounded URL pagination for hosted business contact directories. */
export const CONTACTS_PAGE_SIZE = 50;
export const CONTACTS_MAX_SEARCH_LENGTH = 100;

export type ContactDirectoryQuery = {
  page: number;
  search: string;
};

export function parseContactDirectoryQuery(params: {
  page?: string | string[];
  q?: string | string[];
}): ContactDirectoryQuery {
  const rawPage = typeof params.page === "string" ? params.page : "";
  const value = /^(?:[1-9][0-9]{0,5})$/.test(rawPage) ? Number(rawPage) : 1;
  const rawSearch = typeof params.q === "string" ? params.q : "";
  return {
    page: Math.max(1, value),
    search: rawSearch.trim().slice(0, CONTACTS_MAX_SEARCH_LENGTH),
  };
}

/** Escape LIKE wildcards so search means the entered text, not a SQL pattern. */
export function contactSearchPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

export function contactPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / CONTACTS_PAGE_SIZE));
}

export function contactDirectoryHref(
  view: "customers" | "suppliers",
  page: number,
  search: string,
): string {
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `/dashboard/${view}${suffix ? `?${suffix}` : ""}`;
}
