import { afterEach, describe, expect, it, vi } from "vitest";
import { receiptSettingsStore, tauriDocumentsService } from "./documents";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("web receipt adapter", () => {
  it("returns the desktop receipt and normalizes mirrored settings", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(200, {
        receipt: { sale: { sale_id: 7 } }, source: "desktop-1",
        businessProfile: { id: 1, business_name: "Shop", logo_media_url: "file:///x.png" },
        receiptSettings: { id: 1, show_logo: 0, show_tin: 1, print_profile: "thermal-58mm", copies_per_print: 2 },
      }))
      .mockResolvedValueOnce(json(200, { recorded: true }));
    vi.stubGlobal("fetch", fetchMock);
    const receipt = await tauriDocumentsService.getCanonicalReceipt(7);
    expect(receipt.sale.sale_id).toBe(7);
    const { businessProfile, receiptSettings } = receiptSettingsStore.get();
    expect(businessProfile?.business_name).toBe("Shop");
    expect(businessProfile?.logo_media_url).toBeNull();
    expect(receiptSettings).toMatchObject({ show_logo: false, show_tin: true, print_profile: "thermal-58mm", copies_per_print: 2 });
    await tauriDocumentsService.recordSalePrintAudit(7);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ source: "desktop-1" });
  });

  it("passes server messages through for the desktop dialog's error mapping", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(422, { error: "Receipt unavailable because tax is missing" })));
    await expect(tauriDocumentsService.getCanonicalReceipt(9)).rejects.toThrow("Receipt unavailable because tax is missing");
  });
});
