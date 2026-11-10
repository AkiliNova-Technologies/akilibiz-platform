"use client";

import { createContext, useContext } from "react";

const ActiveBusinessContext = createContext<string | null>(null);

export function ActiveBusinessProvider({
  businessId,
  children,
}: {
  businessId: string;
  children: React.ReactNode;
}) {
  return (
    <ActiveBusinessContext.Provider value={businessId}>
      {children}
    </ActiveBusinessContext.Provider>
  );
}

export function useActiveBusinessId() {
  const businessId = useContext(ActiveBusinessContext);
  if (!businessId) throw new Error("An active business is required.");
  return businessId;
}
