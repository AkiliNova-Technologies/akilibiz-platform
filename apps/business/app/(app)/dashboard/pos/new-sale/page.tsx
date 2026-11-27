"use client";

// The web POS is the desktop POS screen (ported in desktop-port/desktop-pos-page.tsx)
// so cashiers see the same counter, cart and checkout on both platforms.
import DesktopPosPage from "@/components/akilibiz/pos/desktop-port/desktop-pos-page";

export default function POSPage() {
  return <DesktopPosPage />;
}
