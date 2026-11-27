"use client";

// Web stand-in for the desktop's usePermissions on the Products screen. On the
// web, product changes are requests the desktop applies, which only the
// business owner may send; everyone with access may view.
import { useCallback } from "react";
import { useCatalogueState } from "./catalogue-store";

export function usePermissions() {
  const { role } = useCatalogueState();
  const can = useCallback((permission: string) => {
    if (permission.endsWith(".view")) return role !== null;
    return role === "owner";
  }, [role]);
  return { can };
}
