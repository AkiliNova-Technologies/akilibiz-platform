"use client";

// One shared load of the synced desktop catalogue for the ported desktop
// Products screen and its form (/api/products/catalogue).
import { useSyncExternalStore } from "react";
import type { DesktopProductRow } from "@/lib/desktop-product-row";

export type WebCategory = { id: number; hosted_id: string; name: string; is_active: boolean };
type State = {
  products: DesktopProductRow[]; categories: WebCategory[]; role: string | null;
  loading: boolean; error: string | null; loaded: boolean;
};

let state: State = { products: [], categories: [], role: null, loading: false, error: null, loaded: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };
let inflight: Promise<void> | null = null;

export const catalogueStore = {
  get: () => state,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  load(): Promise<void> {
    if (inflight) return inflight;
    set({ loading: true, error: null });
    inflight = (async () => {
      try {
        const response = await fetch("/api/products/catalogue", { cache: "no-store" });
        const body = await response.json().catch(() => null) as
          { products?: DesktopProductRow[]; categories?: WebCategory[]; role?: string; error?: string } | null;
        if (!response.ok || !body?.products) throw new Error(body?.error ?? "Could not load products.");
        set({ products: body.products, categories: body.categories ?? [], role: body.role ?? null, loaded: true, loading: false });
      } catch (cause) {
        set({ loading: false, error: cause instanceof Error ? cause.message : "Could not load products." });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },
};

export function useCatalogueState() {
  return useSyncExternalStore(catalogueStore.subscribe, catalogueStore.get, catalogueStore.get);
}
