const ACCOUNT_STORAGE_PREFIXES = [
  "akilibiz.cash-pilot.",
  "akilibiz.product-request.",
  "akilibiz.purchase-request.",
] as const;

type BrowserStorage = Pick<Storage, "key" | "length" | "removeItem">;

/** Removes account/business operation recovery data without touching preferences. */
export function clearAccountOperationStorage(storage: BrowserStorage) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      key &&
      ACCOUNT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}
