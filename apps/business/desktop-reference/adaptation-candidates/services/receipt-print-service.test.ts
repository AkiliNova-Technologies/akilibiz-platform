import { describe, expect, it, vi } from "vitest";
import { buildReceiptPrintHtml, printReceiptInFrame } from "@/services/receipt-print-service";
import { defaultReceiptPresentationSettings, normalizeReceiptSettingsExample } from "@/components/documents/ReceiptPresentation";
describe("canonical isolated receipt print", () => {
 it("uses canonical totals and thermal profile CSS without application markup", () => { const receipt = normalizeReceiptSettingsExample(); const html = buildReceiptPrintHtml({ receipt, settings: defaultReceiptPresentationSettings, businessProfile: null }); expect(html).toContain("RCPT-000142"); expect(html).toContain("41,150"); expect(html).toContain("size:80mm; margin:3mm"); expect(html).toContain('data-print-profile="thermal-80mm"'); expect(html).not.toMatch(/sidebar|dashboard|navigation/i); });
 it("renders document A4 with document CSS", () => { const html = buildReceiptPrintHtml({ receipt: normalizeReceiptSettingsExample(), settings: { ...defaultReceiptPresentationSettings, print_profile: "document-a4", receipt_width: "A4" }, businessProfile: null }); expect(html).toContain("size:A4; margin:14mm"); expect(html).toContain('data-print-profile="document-a4"'); });
 it("keeps reprint presentation separate from financial facts", () => { const receipt = normalizeReceiptSettingsExample(); const html = buildReceiptPrintHtml({ receipt, settings: defaultReceiptPresentationSettings, businessProfile: null, context: { mode: "reprint" } }); expect(html).toContain("RECEIPT · REPRINT"); expect(html).toContain("41,150"); });
 it("prints only after the receipt iframe has loaded and keeps it through afterprint", async () => {
  const pending = printReceiptInFrame("<!doctype html><body>Receipt</body>");
  const frame = document.querySelector("iframe");
  expect(frame).not.toBeNull();
  const printWindow = frame!.contentWindow!;
  const focus = vi.spyOn(printWindow, "focus");
  const print = vi.spyOn(printWindow, "print").mockImplementation(() => undefined);
  frame!.dispatchEvent(new Event("load"));
  await expect(pending).resolves.toBeUndefined();
  expect(focus).toHaveBeenCalledOnce();
  expect(print).toHaveBeenCalledOnce();
  expect(document.querySelector("iframe")).toBe(frame);
  printWindow.dispatchEvent(new Event("afterprint"));
  expect(document.querySelector("iframe")).toBeNull();
 });
});
