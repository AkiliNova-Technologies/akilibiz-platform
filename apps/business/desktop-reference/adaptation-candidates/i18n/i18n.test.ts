import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, formatCurrency, formatDate, translate } from "@/i18n";
import type { TranslationKey } from "@/i18n";

describe("i18n foundation", () => {
  it("defaults to English for Uganda", () => {
    expect(DEFAULT_LOCALE).toBe("en-UG");
    expect(translate(undefined, "nav.dashboard")).toBe("Dashboard");
  });

  it("uses English fallback for an unknown locale and echoes a missing key", () => {
    expect(translate("missing-locale", "nav.settings")).toBe("Settings");
    expect(translate("en-UG", "missing.key" as TranslationKey)).toBe("missing.key");
  });

  it("provides centralized English labels for the shared navigation hierarchy", () => {
    expect(translate("en-UG", "nav.creditOrders")).toBe("Credit Orders");
    expect(translate("en-UG", "nav.rolesPermissions")).toBe("Roles & Permissions");
    expect(translate("en-UG", "nav.backupRestore")).toBe("Backup & Restore");
  });

  it("formats values through the centralized Uganda display boundary", () => {
    expect(formatCurrency(1200)).toContain("1,200");
    expect(formatDate("2026-08-30T00:00:00.000Z")).toMatch(/Aug.*2026/);
  });
});
