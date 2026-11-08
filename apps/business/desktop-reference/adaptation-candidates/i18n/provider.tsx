import { type ReactNode } from "react";

/** Redux owns the persisted locale; this provider is the stable bootstrap seam for future locale services. */
export function I18nProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
