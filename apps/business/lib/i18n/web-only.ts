import type { TranslationKey } from "./index";

/**
 * Wording for states that exist only on AkiliBiz Web, so the desktop
 * dictionary (which this app copies unchanged) has no key for them. Keep this
 * list short; anything the desktop also shows must use the desktop key.
 * Not yet translated: every locale shows English. Listed in docs/ui-parity.
 */
export const webOnlyLabels = {
  // A synchronized product without a selling price or verified stock position.
  "pos.priceUnavailable": "Price unavailable",
  "pos.inventoryUnavailable": "Inventory unavailable",
} as const;

export type WebOnlyKey = keyof typeof webOnlyLabels;
export type AppLabelKey = TranslationKey | WebOnlyKey;

export function isWebOnlyKey(key: string): key is WebOnlyKey {
  return Object.prototype.hasOwnProperty.call(webOnlyLabels, key);
}
