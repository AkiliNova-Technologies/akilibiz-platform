#!/usr/bin/env node
// Keeps AkiliBiz Web on exactly the same words, building blocks and selling
// rules as AkiliBiz Desktop.
//
// The desktop repository owns these files; the web keeps byte-for-byte copies
// (only import paths are adjusted):
//   * translation dictionaries and helpers        -> lib/i18n
//   * shared UI primitives (buttons, dialogs, ...) -> components/ui
//   * POS quantity and selling-unit rules          -> lib/desktop-shared
//   * the searchable select used by the POS        -> components/akilibiz/desktop-shared
//   * the data table, receipt dialog and layout    -> components/akilibiz
//
//   node scripts/sync-desktop-i18n.mjs          copy from the desktop repository
//   node scripts/sync-desktop-i18n.mjs --check  fail if any web copy has drifted
//
// The desktop repository defaults to the sibling checkout ../akilibiz;
// override with AKILIBIZ_DESKTOP_REPO.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const desktop = resolve(process.env.AKILIBIZ_DESKTOP_REPO ?? resolve(here, "../../../../akilibiz"));

const FILES = [
  ...["en-UG.ts", "lg-UG.ts", "sw-UG.ts", "index.ts"].map((f) => [`src/i18n/${f}`, `lib/i18n/${f}`]),
  ...["dialog", "alert-dialog", "button", "badge", "label", "separator", "card", "input", "select", "field"]
    .map((f) => [`src/components/ui/${f}.tsx`, `components/ui/${f}.tsx`]),
  ["src/components/ui/component-variants.ts", "components/ui/component-variants.ts"],
  ...["pos-quantity", "sale-unit-conversion", "product-quantity-behavior", "product-units"]
    .map((f) => [`src/components/${f}.ts`, `lib/desktop-shared/${f}.ts`]),
  ["src/components/searchable-select.tsx", "components/akilibiz/desktop-shared/searchable-select.tsx"],
  // The data table every list screen uses, with its empty state and refresh button.
  ["src/components/data-table.tsx", "components/akilibiz/data-table.tsx"],
  ["src/components/feedback/feedback-state.tsx", "components/akilibiz/desktop-shared/feedback-state.tsx"],
  ["src/components/date-range-picker.tsx", "components/akilibiz/date-range-picker.tsx"],
  ["src/components/date-range-utils.ts", "components/akilibiz/date-range-utils.ts"],
  ["src/components/feedback/success-dialog.tsx", "components/akilibiz/desktop-shared/success-dialog.tsx"],
  // Products: the desktop product form (add and edit).
  ["src/components/product-sheet.tsx", "components/akilibiz/products/desktop/product-sheet.tsx"],
  ["src/components/refresh-button.tsx", "components/akilibiz/desktop-shared/refresh-button.tsx"],
  // Receipts: the desktop's canonical receipt type, layout, print formats,
  // print service and receipt dialog.
  ["src/types/receipt.ts", "lib/desktop-shared/receipt-types.ts"],
  ["src/services/receipt-print-profiles.ts", "lib/desktop-shared/receipt-print-profiles.ts"],
  ["src/services/receipt-print-service.ts", "lib/desktop-shared/receipt-print-service.ts"],
  ...["receipt-presentation-utils.ts", "ReceiptPresentation.tsx", "templates/DocumentTemplatePreview.tsx", "SalePrintPreviewDialog.tsx", "ReceiptSettingsPreview.tsx"]
    .map((f) => [`src/components/documents/${f}`, `components/akilibiz/documents/desktop/${f}`]),
];

// Desktop import -> web location. Desktop-only data sources map to web
// adapters with the same exports (components/akilibiz/documents/desktop-adapters).
const IMPORTS = [
  ["@/components/feedback/success-dialog", "@/components/akilibiz/desktop-shared/success-dialog"],
  ["@/components/searchable-select", "@/components/akilibiz/desktop-shared/searchable-select"],
  ["@/components/product-units", "@/lib/desktop-shared/product-units"],
  ["@/hooks/useReduxTax", "@/components/akilibiz/products/desktop-adapters/use-redux-tax"],
  ["@/components/date-range-utils", "@/components/akilibiz/date-range-utils"],
  ["@/components/feedback/feedback-state", "@/components/akilibiz/desktop-shared/feedback-state"],
  ["@/components/refresh-button", "@/components/akilibiz/desktop-shared/refresh-button"],
  ["@/types/receipt", "@/lib/desktop-shared/receipt-types"],
  ["@/services/receipt-print-profiles", "@/lib/desktop-shared/receipt-print-profiles"],
  ["@/services/receipt-print-service", "@/lib/desktop-shared/receipt-print-service"],
  ["@/services/tauri/settings", "@/components/akilibiz/documents/desktop-adapters/settings"],
  ["@/services/tauri/documents", "@/components/akilibiz/documents/desktop-adapters/documents"],
  ["@/hooks/useReduxSettings", "@/components/akilibiz/documents/desktop-adapters/use-redux-settings"],
];

const header = (from) =>
  `// GENERATED from the AkiliBiz Desktop repository (${from}). Do not edit here:\n` +
  "// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.\n";

async function transform(from, to, text) {
  let body = text
    .replace(/from "@\/i18n\/([A-Za-z-]+)"/g, 'from "./$1"')
    .replace(/from "@\/hooks\/useI18n"/g, 'from "@/components/akilibiz/i18n/i18n-provider"')
    .replace(/from "@\/components\/documents\//g, 'from "@/components/akilibiz/documents/desktop/')
    .replace(/^"use client";?\s*\n/, "");
  for (const [desktopPath, webPath] of IMPORTS) body = body.split(`from "${desktopPath}"`).join(`from "${webPath}"`);
  // Next.js needs the client directive (first statement, after comments) where
  // the web copy had it before, or where the component uses React hooks.
  const existing = existsSync(resolve(web, to)) ? await readFile(resolve(web, to), "utf8") : "";
  const needsClient = to.endsWith(".tsx") && (
    /^(\/\/[^\n]*\n)*"use client"/.test(existing) ||
    /"use client"/.test(text) || /\buse(I18n|State|Effect|Memo|Callback|Ref|Context)\b/.test(body));
  return header(from) + (needsClient ? '"use client";\n\n' : "") + body;
}

for (const [from] of FILES) {
  if (!existsSync(resolve(desktop, from))) {
    console.error(`Desktop file not found: ${resolve(desktop, from)}. Set AKILIBIZ_DESKTOP_REPO.`);
    process.exit(2);
  }
}
const check = process.argv.includes("--check");
let drift = 0;
for (const [from, to] of FILES) {
  const expected = await transform(from, to, await readFile(resolve(desktop, from), "utf8"));
  const path = resolve(web, to);
  const actual = existsSync(path) ? await readFile(path, "utf8") : null;
  if (actual === expected) continue;
  if (check) {
    drift += 1;
    console.error(`DRIFT: ${to} differs from desktop ${from}`);
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
    console.log(`synced ${to}`);
  }
}
if (check && drift) process.exit(1);
if (check) console.log("Web shared files match the desktop.");
