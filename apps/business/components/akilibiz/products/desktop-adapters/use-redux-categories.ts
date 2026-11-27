"use client";

// Web stand-in for the desktop's useReduxCategories (read-only list).
import { useCallback } from "react";
import { catalogueStore, useCatalogueState } from "./catalogue-store";

export function useReduxCategories() {
  const { categories, loading, error } = useCatalogueState();
  const getCategories = useCallback(() => catalogueStore.load(), []);
  return { categories, loading, error, getCategories };
}
