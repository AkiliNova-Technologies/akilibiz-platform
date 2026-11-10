import { describe, expect, it } from "vitest";
import { parseReceiptSettings, parseTaxSettings } from "./hosted-settings-contract";

const receipt = {
  business_header: "A & E Retailers",
  footer_message: "",
  show_logo: 1,
  show_tin: 1,
  show_cashier_name: 0,
  show_customer_name: 1,
  show_payment_method: 1,
  show_thank_you_note: 1,
  receipt_width: "80mm",
  print_profile: "thermal-80mm",
  copies_per_print: 2,
  auto_print_after_sale: 0,
};

describe("hosted settings snapshot contracts", () => {
  it("loads valid SQLite receipt values including genuine false flags", () => {
    expect(parseReceiptSettings(receipt)).toMatchObject({
      business_header: "A & E Retailers",
      show_cashier_name: false,
      show_logo: true,
      auto_print_after_sale: false,
      copies_per_print: 2,
      print_profile: "thermal-80mm",
    });
  });
  it("never treats incomplete receipt snapshots as stored defaults", () => {
    expect(parseReceiptSettings({ ...receipt, show_tin: undefined })).toBeNull();
    expect(parseReceiptSettings({ ...receipt, copies_per_print: 0 })).toBeNull();
    expect(parseReceiptSettings({ ...receipt, print_profile: "unknown" })).toBeNull();
  });
  it("requires both valid desktop tax records", () => {
    const settings = { vat_registered: 1, vat_registration_number: "VAT-100" };
    const config = { default_tax_name: "VAT", tax_number: "TIN-200", show_tax_on_receipt: 0 };
    expect(parseTaxSettings(settings, config)).toEqual({
      vat_registered: true, vat_registration_number: "VAT-100",
      default_tax_name: "VAT", tax_number: "TIN-200", show_tax_on_receipt: false,
    });
    expect(parseTaxSettings(settings, {})).toBeNull();
    expect(parseTaxSettings({ ...settings, vat_registered: null }, config)).toBeNull();
  });
});
