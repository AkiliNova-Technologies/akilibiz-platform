import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsSnapshotPlaceholder } from "./settings-snapshot-placeholder";

describe("hosted settings loading layout", () => {
  it("renders tax settings structure during loading without fabricated saved values", () => {
    const markup = renderToStaticMarkup(<SettingsSnapshotPlaceholder kind="tax" state="loading" />);
    expect(markup).toContain("VAT Registration");
    expect(markup).toContain("Business TIN");
    expect(markup).toContain("Show tax on receipts");
    expect(markup).toContain("aria-busy=\"true\"");
    expect(markup).not.toContain("Loading desktop settings");
    expect(markup).not.toContain("value=\"VAT\"");
  });
  it("preserves receipt layout and preview without showing browser defaults", () => {
    const markup = renderToStaticMarkup(<SettingsSnapshotPlaceholder kind="receipt" state="loading" />);
    expect(markup).toContain("Receipt Configuration");
    expect(markup).toContain("Copies Per Print");
    expect(markup).toContain("Live receipt preview");
    expect(markup).not.toContain("thermal-80mm");
    expect(markup).not.toContain("Your business (preview)");
  });
  it("keeps fields visible but not editable when no synchronized data exists", () => {
    const markup = renderToStaticMarkup(<SettingsSnapshotPlaceholder kind="tax" state="unavailable" />);
    expect(markup).toContain("VAT registration number");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<button");
    expect(markup).toContain("aria-hidden=\"true\"");
  });
});
