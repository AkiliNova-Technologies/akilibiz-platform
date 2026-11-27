#!/usr/bin/env node
// Measures how closely each AkiliBiz Web screen matches its Desktop screen.
//
// For every mapped screen it collects the translation keys the desktop screen
// (and the components it imports) uses, then checks whether the web screen
// (and its imports) shows the same text: either the same key through the shared
// dictionary, or the identical English wording. Writes docs/ui-parity/report.md.
//
//   node scripts/ui-parity-report.mjs
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const desktop = resolve(process.env.AKILIBIZ_DESKTOP_REPO ?? resolve(here, "../../../../akilibiz"));

// Desktop screen -> web route directory (under app/(app)/dashboard).
const SCREENS = {
  DashboardPage: "", AnalyticsPage: "analytics", AccountPage: "account",
  POSPage: "pos/new-sale", CreditOrdersPage: "pos/credit", SalesHistoryPage: "pos/history",
  ProductsPage: "products", ProductCategoriesPage: "products/categories",
  InventoryPage: "inventory", InventoryStockAdjustmentPage: "inventory/adjustment",
  InventoryLowStockAlertsPage: "inventory/alerts", InventoryStockHistoryPage: "inventory/history",
  CustomersPage: "customers", CustomerCreditManagementPage: "customers/credit",
  CustomerPurchaseHistoryPage: "customers/history",
  SuppliersPage: "suppliers", SupplierPurchaseOrdersPage: "suppliers/orders", SupplierPaymentsPage: "suppliers/payments",
  FinanceOverviewPage: "finance", FinanceExpensesPage: "finance/expenses", FinanceIncomePage: "finance/income",
  FinanceCashFlowPage: "finance/cashflow", FinanceLedgerPage: "finance/ledger", FinanceTaxPage: "finance/tax",
  ReportsOverviewPage: "reports", ReportsSalesPage: "reports/sales", ReportsInventoryPage: "reports/inventory",
  ReportsFinancialPage: "reports/financial", ReportsPurchasingPage: "reports/purchasing",
  StaffPage: "staff", StaffRolesPermissionsPage: "staff/roles", StaffActivityLogsPage: "staff/logs",
  SettingsOverviewPage: "settings", SettingsBusinessProfilePage: "settings/business",
  SettingsReceiptPage: "settings/receipt", SettingsTaxConfigurationPage: "settings/tax",
  SettingsBackupRestorePage: "settings/backup", SettingsLanguagePage: "settings/language",
  SettingsAccountingPeriodsPage: "settings/accounting-periods", SettingsMerchantWalletsPage: "settings/merchant-wallets",
};

// Page header, sidebar and navigation live in the app shell on both platforms.
// Desktop data hooks (useReduxProducts, ...) carry CRUD notifications for other
// screens; they are not part of the screen that imports them.
const SKIP_DESKTOP_DATA_HOOKS = true;
const SHELL_IMPORTS = ["/site-header", "/app-sidebar", "/nav-main", "/nav-user", "/app-shell"];
const SHELL = {
  desktop: ["src/layout/DashboardLayout.tsx", "src/components/app-sidebar.tsx", "src/components/site-header.tsx", "src/components/nav-main.tsx", "src/components/nav-user.tsx"],
  web: ["components/akilibiz/account-menu.tsx", "app/(app)/dashboard/sign-out-button.tsx", "components/akilibiz/app-shell.tsx", "components/akilibiz/app-sidebar.tsx", "components/akilibiz/site-header.tsx", "components/akilibiz/nav-main.tsx", "components/akilibiz/nav-user.tsx"],
};

const dictionary = Object.fromEntries(
  [...(await readFile(resolve(desktop, "src/i18n/en-UG.ts"), "utf8"))
    .matchAll(/^\s+"([^"]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => [m[1], m[2]]),
);

const IMPORT = /from\s+"(@\/[^"]+|\.{1,2}\/[^"]+)"/g;
async function collect(entry, root, alias, seen = new Set(), depth = 0) {
  if (!existsSync(entry) || seen.has(entry) || depth > 4) return seen;
  seen.add(entry);
  const text = await readFile(entry, "utf8");
  for (const [, spec] of text.matchAll(IMPORT)) {
    if (spec.includes("/ui/") || spec.includes("/i18n")) continue; // primitives and dictionaries
    if (SHELL_IMPORTS.some((name) => spec.endsWith(name))) continue; // measured as the shell row
    if (SKIP_DESKTOP_DATA_HOOKS && /\/hooks\/useRedux/.test(spec)) continue; // data-layer toasts, not screen text
    const base = spec.startsWith("@/") ? resolve(root, alias, spec.slice(2)) : resolve(dirname(entry), spec);
    for (const candidate of [base + ".tsx", base + ".ts", resolve(base, "index.tsx"), resolve(base, "index.ts")]) {
      if (existsSync(candidate)) { await collect(candidate, root, alias, seen, depth + 1); break; }
    }
  }
  return seen;
}
async function source(files) {
  return (await Promise.all([...files].map((f) => readFile(f, "utf8")))).join("\n");
}
const keysIn = (text) => new Set([...text.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g)].map((m) => m[1]).filter((k) => k in dictionary));
const normalise = (s) => s.replace(/\{\{\w+\}\}/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const rows = [];
for (const [screen, route] of Object.entries(SCREENS)) {
  const desktopFile = resolve(desktop, "src/app/dashboard", `${screen}.tsx`);
  const webFile = resolve(web, "app/(app)/dashboard", route, "page.tsx");
  const desktopKeys = keysIn(await source(await collect(desktopFile, resolve(desktop, "src"), "")));
  // Each screen's header title is set from lib/desktop-navigation.ts (desktopPageHeaders).
  const headerEntry = (await readFile(resolve(web, "lib/desktop-navigation.ts"), "utf8"))
    .match(new RegExp(`\\b${screen}: \\{[^}]*\\}`))?.[0] ?? "";
  const webText = (existsSync(webFile) ? await source(await collect(webFile, web, "")) : "") + "\n" +
    headerEntry.replace(/key: "([^"]+)"/, 't("$1")');
  const webKeys = keysIn(webText);
  const webLower = webText.toLowerCase();
  const missing = [...desktopKeys].filter((key) => {
    if (webKeys.has(key)) return false;
    const words = normalise(dictionary[key]);
    return !(words.length > 2 && webLower.includes(words));
  });
  const parity = desktopKeys.size ? Math.round(100 * (desktopKeys.size - missing.length) / desktopKeys.size) : 100;
  rows.push({ screen, route: `/dashboard${route ? "/" + route : ""}`, total: desktopKeys.size, missing, parity, webExists: existsSync(webFile) });
}
{
  const read = async (root, files) => source(files.map((f) => resolve(root, f)).filter((f) => existsSync(f)));
  const desktopKeys = keysIn(await read(desktop, SHELL.desktop));
  const webText = await read(web, SHELL.web);
  const webKeys = keysIn(webText);
  const webLower = webText.toLowerCase();
  const missing = [...desktopKeys].filter((key) => !webKeys.has(key) &&
    !(normalise(dictionary[key]).length > 2 && webLower.includes(normalise(dictionary[key]))));
  rows.push({ screen: "App shell (sidebar, header, navigation)", route: "(every screen)", total: desktopKeys.size, missing,
    parity: desktopKeys.size ? Math.round(100 * (desktopKeys.size - missing.length) / desktopKeys.size) : 100, webExists: true });
}
rows.sort((a, b) => a.parity - b.parity || b.total - a.total);
const overallTotal = rows.reduce((n, r) => n + r.total, 0);
const overallMatched = rows.reduce((n, r) => n + r.total - r.missing.length, 0);
let md = `# Web ↔ Desktop UI text parity\n\nGenerated by \`apps/business/scripts/ui-parity-report.mjs\` from source. For each desktop screen it\ncounts the labels (translation keys) the screen and its components show, and whether the matching web\nscreen shows the same text (shared key or identical English). It measures **wording**, not layout; layout\nparity is reviewed per screen in \`docs/ui-parity/screens.md\`.\n\n**Overall: ${overallMatched} of ${overallTotal} desktop labels present on the web (${Math.round(100 * overallMatched / overallTotal)} %).**\n\n| Screen (desktop) | Web route | Labels | Missing on web | Parity |\n| --- | --- | ---: | ---: | ---: |\n`;
for (const r of rows) md += `| ${r.screen} | \`${r.route}\`${r.webExists ? "" : " (missing)"} | ${r.total} | ${r.missing.length} | ${r.parity} % |\n`;
md += `\n## Missing labels by screen\n`;
for (const r of rows.filter((r) => r.missing.length)) {
  md += `\n### ${r.screen} — ${r.missing.length} missing\n\n`;
  for (const key of r.missing.slice(0, 60)) md += `- \`${key}\`: ${dictionary[key].replace(/\|/g, "\\|")}\n`;
  if (r.missing.length > 60) md += `- … and ${r.missing.length - 60} more\n`;
}
await mkdir(resolve(web, "../../docs/ui-parity"), { recursive: true });
await writeFile(resolve(web, "../../docs/ui-parity/report.md"), md);
console.log(`Overall ${overallMatched}/${overallTotal} labels (${Math.round(100 * overallMatched / overallTotal)} %)`);
for (const r of rows) console.log(`${String(r.parity).padStart(3)} %  ${String(r.missing.length).padStart(4)} missing  ${r.screen}`);
