"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

type PosHeaderControls = {
  itemCount: number;
  registerClearSale: (itemCount: number, action: () => void) => void;
  unregisterClearSale: () => void;
  clearSale: () => void;
};

const PosHeaderContext = createContext<PosHeaderControls | null>(null);

export function PosHeaderProvider({ children }: { children: ReactNode }) {
  const actionRef = useRef<(() => void) | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const registerClearSale = useCallback((count: number, action: () => void) => {
    actionRef.current = action;
    setItemCount(count);
  }, []);
  const unregisterClearSale = useCallback(() => {
    actionRef.current = null;
    setItemCount(0);
  }, []);
  const clearSale = useCallback(() => actionRef.current?.(), []);
  return (
    <PosHeaderContext.Provider value={{ itemCount, registerClearSale, unregisterClearSale, clearSale }}>
      {children}
    </PosHeaderContext.Provider>
  );
}

export function usePosHeaderControls() {
  const controls = useContext(PosHeaderContext);
  if (!controls) throw new Error("POS header controls require PosHeaderProvider");
  return controls;
}

export function PosClearSaleHeaderAction() {
  const { itemCount, clearSale } = usePosHeaderControls();
  const { t } = useI18n();
  // Desktop POSPage header action: outline button, X icon, pos.clearSale.
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={clearSale} disabled={itemCount === 0}>
        <IconX className="size-4" />
        {t("pos.clearSale")}
      </Button>
    </div>
  );
}
