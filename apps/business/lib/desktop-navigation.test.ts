import { describe, expect, it } from "vitest";
import { desktopNavigation, findDesktopRoute } from "./desktop-navigation";

describe("desktop navigation parity", () => {
  const routes = desktopNavigation.flatMap((group) => group.items.map((item) => item.href));

  it("has unique, absolute dashboard destinations", () => {
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.every((route) => route.startsWith("/dashboard"))).toBe(true);
  });

  it("includes the desktop-only routes previously omitted from the web migration", () => {
    expect(routes).toContain("/dashboard/finance/tax");
    expect(routes).toContain("/dashboard/settings/merchant-wallets");
  });

  it("uses the desktop Backup & Restore wording in the sidebar and header", () => {
    expect(findDesktopRoute("/dashboard/settings/backup")?.item).toMatchObject({
      label: "Backup & Restore", labelKey: "nav.backupRestore",
    });
  });

  it("labels every menu item with the desktop translation key", () => {
    // The desktop also shows these two items untranslated.
    const untranslated = new Set(["/dashboard/finance/tax", "/dashboard/settings/merchant-wallets"]);
    for (const group of desktopNavigation) {
      expect(group.labelKey).toBeTruthy();
      for (const item of group.items) {
        expect(Boolean(item.labelKey)).toBe(!untranslated.has(item.href));
      }
    }
  });

  it("resolves every menu item to its own navigation group", () => {
    for (const group of desktopNavigation) {
      for (const item of group.items) {
        expect(findDesktopRoute(item.href)).toEqual({ group, item });
      }
    }
  });
});
