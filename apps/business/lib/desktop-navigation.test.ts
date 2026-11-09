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

  it("uses the same Backup, Restore & Sync label in the sidebar and header", () => {
    expect(findDesktopRoute("/dashboard/settings/backup")?.item.label).toBe("Backup, Restore & Sync");
  });

  it("resolves every menu item to its own navigation group", () => {
    for (const group of desktopNavigation) {
      for (const item of group.items) {
        expect(findDesktopRoute(item.href)).toEqual({ group, item });
      }
    }
  });
});
