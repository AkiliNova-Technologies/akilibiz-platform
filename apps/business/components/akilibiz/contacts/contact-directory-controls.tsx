import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CONTACTS_PAGE_SIZE,
  contactDirectoryHref,
  contactPageCount,
} from "@/lib/contact-directory-query";

export type DirectoryPagination = {
  page: number;
  total: number;
  search: string;
};

export function ContactDirectoryControls({
  view,
  pagination,
}: {
  view: "customers" | "suppliers";
  pagination: DirectoryPagination;
}) {
  const { page, total, search } = pagination;
  const maxPage = contactPageCount(total);
  const first = total === 0 ? 0 : (page - 1) * CONTACTS_PAGE_SIZE + 1;
  const last = Math.min(page * CONTACTS_PAGE_SIZE, total);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end sm:justify-between">
      <form action={`/dashboard/${view}`} method="get" className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
        <label htmlFor={`${view}-server-search`} className="text-sm font-medium">
          Search {view}
        </label>
        <div className="flex gap-2">
          <input
            id={`${view}-server-search`}
            name="q"
            type="search"
            defaultValue={search}
            maxLength={100}
            placeholder={`Search all ${view} by name`}
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">Search</Button>
          {search && <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/${view}`}>Clear</Link>
          </Button>}
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-1 text-muted-foreground" aria-live="polite">
          {first}–{last} of {total.toLocaleString("en-UG")} results
        </span>
        {page > 1 ? (
          <Button asChild size="sm" variant="outline">
            <Link href={contactDirectoryHref(view, page - 1, search)}>Previous</Link>
          </Button>
        ) : <Button size="sm" variant="outline" disabled>Previous</Button>}
        <span className="tabular-nums">Page {page} of {maxPage}</span>
        {page < maxPage ? (
          <Button asChild size="sm" variant="outline">
            <Link href={contactDirectoryHref(view, page + 1, search)}>Next</Link>
          </Button>
        ) : <Button size="sm" variant="outline" disabled>Next</Button>}
      </div>
    </div>
  );
}
