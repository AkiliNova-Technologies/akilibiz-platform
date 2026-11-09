// Optional, disposable, read-only browser acceptance of the protected Vercel
// Preview. Called only while the hosted qualification harness keeps its two
// temporary identities and business records alive.
//
// The host provides short-lived test credentials through child-process env.
// Do not log them, save browser state, screenshots, traces, or HARs.
import { readFile } from "node:fs/promises";

const required = [
  "AKILIBIZ_PREVIEW_URL",
  "AKILIBIZ_BROWSER_USER_A_EMAIL",
  "AKILIBIZ_BROWSER_USER_B_EMAIL",
  "AKILIBIZ_BROWSER_USER_PASSWORD",
  "AKILIBIZ_BROWSER_RUN_ID",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing browser qualification setting: ${name}`);
}
const origin = new URL(process.env.AKILIBIZ_PREVIEW_URL);
if (origin.protocol !== "https:" || !origin.hostname.endsWith(".vercel.app") ||
    origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("Browser acceptance requires a Vercel HTTPS preview origin.");
}
if (!process.env.AKILIBIZ_VERCEL_BYPASS_SECRET && !process.env.AKILIBIZ_VERCEL_STORAGE_STATE) {
  throw new Error("Protected preview requires an authorized Vercel bypass secret or local Vercel SSO storage state.");
}
let chromium;
try {
  ({ chromium } = await import(process.env.AKILIBIZ_PLAYWRIGHT_MODULE ?? "playwright"));
} catch {
  throw new Error("Playwright is unavailable. Install it in a separate local testing environment and set AKILIBIZ_PLAYWRIGHT_MODULE to its entrypoint.");
}
const settings = {
  baseURL: origin.origin,
  ignoreHTTPSErrors: false,
};
if (process.env.AKILIBIZ_VERCEL_STORAGE_STATE) {
  const path = process.env.AKILIBIZ_VERCEL_STORAGE_STATE;
  // Validate the file before handing its sensitive contents to Playwright.
  const state = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
    throw new Error("Invalid private Vercel SSO browser state file.");
  }
  settings.storageState = state;
}
if (process.env.AKILIBIZ_VERCEL_BYPASS_SECRET) {
  settings.extraHTTPHeaders = {
    "x-vercel-protection-bypass": process.env.AKILIBIZ_VERCEL_BYPASS_SECRET,
  };
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const passed = [];
const assert = (condition, description) => {
  if (!condition) throw new Error(description);
  passed.push(description);
};
const within = async (context, path) => {
  const page = await context.newPage();
  const response = await page.goto(new URL(path, origin.origin).href, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  if (!response || response.status() >= 400) {
    throw new Error(`Preview route failed: ${path} (HTTP ${response?.status() ?? "none"})`);
  }
  if (/vercel\.app\/login|vercel\.com\/login/.test(page.url()) ||
      /authentication required|vercel authentication/i.test(await page.title())) {
    throw new Error("Vercel preview protection was not authenticated.");
  }
  return page;
};
async function authenticate(email, expectedName, expectedAmount) {
  const context = await browser.newContext(settings);
  try {
    const page = await within(context, "/sign-in");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(process.env.AKILIBIZ_BROWSER_USER_PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/businesses(?:\?|$)/, { timeout: 60000 });
    assert((await page.locator("body").innerText()).includes(expectedName),
      `business selector lists ${expectedName}`);
    await page.getByRole("button", { name: /^(Open|Continue)/ }).click();
    await page.waitForURL(/\/dashboard(?:\/|\?|$)/, { timeout: 60000 });
    assert(page.url().includes("/dashboard"), `business ${expectedName} opens`);

    // The browser, not the harness's privileged database connection, makes
    // these same-origin API requests with the active business cookie.
    const readMirror = async (entity, pageNumber) => page.evaluate(async ({ entity, pageNumber }) => {
      const response = await fetch(`/api/financial-mirrors?entity=${encodeURIComponent(entity)}&page=${pageNumber}&pageSize=1`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      return { status: response.status, body: await response.json() };
    }, { entity, pageNumber });

    const first = await readMirror("finance_transactions", 1);
    assert(first.status === 200 && first.body.readOnly === true,
      `owner ${expectedName} receives read-only financial projection`);
    assert(first.body.rows.some((row) => row.record?.amount_ugx === expectedAmount),
      `owner ${expectedName} sees expected source financial amount`);
    assert(Boolean(first.body.lastSuccessfulSync), `owner ${expectedName} sees sync time`);
    const empty = await readMirror("finance_transactions", 99);
    assert(empty.status === 200 && empty.body.rows.length === 0,
      `owner ${expectedName} sees valid empty pagination`);
    assert(empty.body.lastSuccessfulSync === first.body.lastSuccessfulSync,
      `owner ${expectedName} retains sync timestamp on empty page`);
    const invalid = await readMirror("invalid_entity", 1);
    assert(invalid.status === 400, `owner ${expectedName} gets unsupported-entity rejection`);

    const pages = [
      "/dashboard/products/synced",
      "/dashboard/customers",
      "/dashboard/suppliers",
      "/dashboard/inventory",
      "/dashboard/finance/income",
      "/dashboard/finance/expenses",
      "/dashboard/finance/ledger",
    ];
    for (const path of pages) {
      const destination = await within(context, path);
      assert(!/\/sign-in|\/businesses/.test(new URL(destination.url()).pathname),
        `authenticated ${expectedName} can open ${path}`);
      await destination.close();
    }
    await page.close();
  } finally {
    await context.close();
  }
}
try {
  await authenticate(process.env.AKILIBIZ_BROWSER_USER_A_EMAIL, "Phase1C A", 25000);
  await authenticate(process.env.AKILIBIZ_BROWSER_USER_B_EMAIL, "Phase1C B", 12345);
  console.log(`PASS: ${passed.length} protected preview browser assertions (run ${process.env.AKILIBIZ_BROWSER_RUN_ID})`);
} catch (error) {
  // Never dump requests, browser state or stack traces; they may contain
  // session values. Report only the test name or a sanitized error category.
  failures.push(error instanceof Error ? error.message.replace(/eyJ[A-Za-z0-9._-]+/g, "<token>") : "browser acceptance failed");
  console.error(`FAIL: protected preview acceptance: ${failures.join("; ")}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
