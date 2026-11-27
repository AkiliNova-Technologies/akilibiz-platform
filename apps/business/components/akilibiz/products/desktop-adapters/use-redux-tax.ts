"use client";

// Web stand-in for the desktop's useReduxTax, limited to the tax classes the
// product form lists. They are the desktop's fixed seeded classes.
import { useCallback } from "react";
import { DESKTOP_TAX_CLASSIFICATIONS } from "@/lib/desktop-product-row";

const classifications = DESKTOP_TAX_CLASSIFICATIONS.map((c) => ({ ...c }));

export function useReduxTax() {
  const getTaxClassifications = useCallback(async () => classifications, []);
  return { classifications, getTaxClassifications };
}
