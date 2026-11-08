import { describe, expect, it } from "vitest";
import { translate } from "@/i18n";

describe("product and category i18n resources", () => {
  it("provides English Uganda validation and association labels", () => {
    expect(translate("en-UG", "productForm.categoryRequired")).toBe("Category is required");
    expect(translate("en-UG", "products.lowStock", { stock: 4 })).toBe("Low: 4");
    expect(translate("en-UG", "categories.activeCount", { count: 2 })).toBe("2 active categories");
  });

  it("interpolates POS sale completion and stock labels", () => {
    expect(translate("en-UG", "pos.saleCompleted", { number: "SALE-42" })).toBe("Sale SALE-42 completed successfully");
    expect(translate("en-UG", "pos.lowStock", { count: 3 })).toBe("Low: 3");
  });

  it("provides inventory adjustment validation and stock labels", () => {
    expect(translate("en-UG", "inventory.quantityInvalid")).toBe("Adjustment quantity must be greater than zero");
    expect(translate("en-UG", "inventory.lowStock")).toBe("Low Stock");
    expect(translate("en-UG", "inventory.stockIn")).toBe("Stock In");
    expect(translate("en-UG", "inventory.adjustmentDetails")).toBe("Adjustment Details");
  });

  it("provides customer validation and supplier labels", () => {
    expect(translate("en-UG", "customers.nameRequired")).toBe("Customer name is required");
    expect(translate("en-UG", "suppliers.contactPerson")).toBe("Contact Person");
    expect(translate("en-UG", "customers.profile")).toBe("Customer Profile");
    expect(translate("en-UG", "importExport.importRecords", { count: 4 })).toBe("Import 4 Records");
  });

  it("provides finance and report presentation labels", () => {
    expect(translate("en-UG", "finance.netBalance")).toBe("Net Balance");
    expect(translate("en-UG", "reports.safeLoadError")).toBe("Report data is currently unavailable.");
  });

  it("provides checkout and receipt presentation labels", () => {
    expect(translate("en-UG", "pos.changeDue")).toBe("Change Due");
    expect(translate("en-UG", "receipt.printAuditFailed")).toBe("Print acknowledgement could not be recorded. The sale is unchanged.");
  });

  it("interpolates the sales VAT notice", () => {
    expect(translate("en-UG", "sales.vatNotice", { jurisdiction: "URA" })).toBe("VAT collected on behalf of URA tax authority");
  });
});
