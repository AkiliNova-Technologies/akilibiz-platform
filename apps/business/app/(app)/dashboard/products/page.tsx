"use client";

// The web Products screen is the desktop Products screen (ported in
// products/desktop-port/desktop-products-page.tsx) so both platforms show the
// same catalogue, cards, table, actions and dialogs.
import DesktopProductsPage from "@/components/akilibiz/products/desktop-port/desktop-products-page";

export default function ProductsPage() {
  return <DesktopProductsPage />;
}
