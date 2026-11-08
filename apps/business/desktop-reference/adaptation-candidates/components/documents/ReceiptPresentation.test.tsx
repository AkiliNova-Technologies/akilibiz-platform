import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptPresentation, defaultReceiptPresentationSettings, normalizeReceiptSettingsExample } from "@/components/documents/ReceiptPresentation";
import { SalePrintPreviewDialog } from "@/components/documents/SalePrintPreviewDialog";
const receipt = normalizeReceiptSettingsExample();
const mocks = vi.hoisted(() => ({ canonical: vi.fn(), profile: vi.fn().mockResolvedValue(null), settings: vi.fn().mockResolvedValue(null), print: vi.fn(), t: (key: string) => key }));
vi.mock("@/hooks/useReduxSettings", () => ({ useReduxSettings: () => ({ businessProfile: null, receiptSettings: defaultReceiptPresentationSettings, getBusinessProfile: mocks.profile, getReceiptSettings: mocks.settings }) }));
vi.mock("@/services/tauri/documents", () => ({ tauriDocumentsService: { getCanonicalReceipt: mocks.canonical, recordSalePrintAudit: vi.fn() } }));
vi.mock("@/services/receipt-print-service", () => ({ buildReceiptPrintHtml: vi.fn(), printReceiptDocument: mocks.print }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t: mocks.t }) }));
describe("canonical receipt presentation", () => {
 it("renders persisted totals rather than deriving line price times quantity", () => { const altered = { ...receipt, lines: [{ ...receipt.lines[0], quantity_milli: 2000, unit_price_ugx: 1, line_total_ugx: 36000 }] }; render(<ReceiptPresentation receipt={altered} settings={defaultReceiptPresentationSettings} />); expect(screen.getAllByText(/36,000/).length).toBeGreaterThan(0); });
 it("loads canonical receipt by sale id", async () => { mocks.canonical.mockResolvedValue(receipt); render(<SalePrintPreviewDialog saleId={42} open onOpenChange={vi.fn()} />); await screen.findByTestId("sale-receipt-paper"); expect(mocks.canonical).toHaveBeenCalledWith(42); });
});
