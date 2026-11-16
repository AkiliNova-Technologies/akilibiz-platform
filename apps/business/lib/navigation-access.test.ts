import {describe,expect,it} from "vitest";
import {desktopNavigation} from "./desktop-navigation";
import {navigationForBusinessRole} from "./navigation-access";

describe("server-verified business role navigation",()=>{
  const routes=(role:Parameters<typeof navigationForBusinessRole>[0])=>
    navigationForBusinessRole(role).flatMap(group=>group.items.map(item=>item.href));
  it("retains full desktop parity for verified owner membership",()=>{
    expect(navigationForBusinessRole("owner")).toEqual(desktopNavigation);
  });
  it("does not expose sensitive finance, staffing or supplier mirrors to nonowners",()=>{
    for(const role of ["manager","cashier","inventory_staff","accountant"] as const){
      const displayed=routes(role);
      expect(displayed).not.toContain("/dashboard/staff/roles");
      expect(displayed).not.toContain("/dashboard/finance/ledger");
      expect(displayed).not.toContain("/dashboard/suppliers/payments");
      expect(displayed).not.toContain("/dashboard/settings/backup");
      expect(displayed).toContain("/dashboard");
    }
  });
  it("allows cashier and manager only the explicitly supported POS entry",()=>{
    for(const role of ["manager","cashier"] as const){
      expect(routes(role)).toContain("/dashboard/pos/new-sale");
      expect(routes(role)).not.toContain("/dashboard/pos/credit");
    }
  });
  it("fails closed with no active business selection",()=>{
    expect(navigationForBusinessRole(null)).toEqual([]);
  });
  it("never mutates desktop navigation or its item order",()=>{
    const before=JSON.stringify(desktopNavigation);
    navigationForBusinessRole("manager");
    navigationForBusinessRole("cashier");
    expect(JSON.stringify(desktopNavigation)).toBe(before);
  });
});
