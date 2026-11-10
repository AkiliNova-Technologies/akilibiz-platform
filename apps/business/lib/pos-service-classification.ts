import { isHostedServiceCategory } from "./pos-catalogue";

/**
 * Reconcile the authoritative POS service category against catalogue product flags.
 * The desktop catalogue snapshot does not yet contain product_type; only the
 * exact Services & Fees category is treated as non-stock.
 *
 * This only adjusts service inventory eligibility. It never invents a selling
 * price or relaxes availability for any other category.
 */
export function normalizePosServiceProducts<
  T extends { category_id: string | null; is_service: boolean; inventory_available: boolean },
  C extends { id: string; name: string },
>(products: T[], categories: C[]): T[] {
  const serviceCategoryIds = new Set(
    categories.filter((category) => isHostedServiceCategory(category.name)).map((category) => category.id),
  );
  return products.map((product) => {
    const isService = product.category_id !== null && serviceCategoryIds.has(product.category_id);
    if (product.is_service === isService && (!isService || product.inventory_available)) return product;
    return {
      ...product,
      is_service: isService,
      inventory_available: isService ? true : product.inventory_available,
    };
  });
}
