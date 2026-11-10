export type HostedPosCategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
};

export type HostedPosProductRow = {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  selling_price_ugx: number | null;
  stock_unit: string;
  is_active: boolean;
};

export type HostedPosInventoryRow = {
  product_id: string;
  on_hand_milli: number | null;
  reserved_milli: number | null;
  damaged_milli: number | null;
  is_current: boolean;
};

export type PosCatalogueProduct = {
  id: string;
  name: string;
  sku: string;
  selling_price: number | null;
  stock_quantity: number;
  stock_unit: string;
  inventory_available: boolean;
  is_active: boolean;
  is_taxable: false;
  tax_classification_id: null;
  tax_inclusive: false;
  category_id: string | null;
};

export type PosCatalogueCategory = { id: string; name: string };

/** Maps the hosted catalogue and its effective inventory read model into the POS contract. */
export function mapHostedPosCatalogue(
  products: HostedPosProductRow[],
  categories: HostedPosCategoryRow[],
  inventory: HostedPosInventoryRow[],
) {
  const currentInventory = new Map(
    inventory
      .filter((position) => position.is_current)
      .map((position) => [position.product_id, position]),
  );

  return {
    categories: categories
      .filter((category) => category.is_active)
      .map(({ id, name }) => ({ id, name })),
    products: products.map((product): PosCatalogueProduct => {
      const position = currentInventory.get(product.id);
      const hasInventory =
        position?.on_hand_milli !== null &&
        position?.on_hand_milli !== undefined &&
        position?.reserved_milli !== null &&
        position?.reserved_milli !== undefined &&
        position?.damaged_milli !== null &&
        position?.damaged_milli !== undefined &&
        Number.isSafeInteger(position.on_hand_milli) &&
        Number.isSafeInteger(position.reserved_milli) &&
        Number.isSafeInteger(position.damaged_milli) &&
        position.reserved_milli >= 0 &&
        position.damaged_milli >= 0;
      // Sellable stock excludes reservations and damage, consistent with
      // /api/pos/quote. Negative availability is clamped to zero; it is never
      // evidence of a positive sellable balance.
      const availableMilli = hasInventory
        ? Math.max(0, position.on_hand_milli! - position.reserved_milli! - position.damaged_milli!)
        : 0;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        selling_price:
          product.selling_price_ugx !== null &&
          Number.isSafeInteger(product.selling_price_ugx)
            ? product.selling_price_ugx
            : null,
        // Unknown inventory is deliberately unavailable, never positive stock.
        stock_quantity: Number.isSafeInteger(availableMilli) ? availableMilli / 1000 : 0,
        stock_unit: product.stock_unit,
        inventory_available: hasInventory && Number.isSafeInteger(availableMilli),
        is_active: product.is_active,
        is_taxable: false,
        tax_classification_id: null,
        tax_inclusive: false,
        category_id: product.category_id,
      };
    }),
  };
}
