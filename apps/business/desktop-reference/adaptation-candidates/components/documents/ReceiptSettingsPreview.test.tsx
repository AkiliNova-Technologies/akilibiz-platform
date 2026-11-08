import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ReceiptSettingsPreview,
  type ReceiptPreviewSettings,
} from "@/components/documents/ReceiptSettingsPreview";
import type { BusinessProfile } from "@/services/tauri/settings";

const settings: ReceiptPreviewSettings = {
  business_header: "Akili Market",
  footer_message: "Come again soon.",
  show_logo: true,
  show_tin: true,
  show_cashier_name: true,
  show_customer_name: true,
  show_payment_method: true,
  show_thank_you_note: true,
  receipt_width: "80mm",
  copies_per_print: 1,
};

const businessProfile: BusinessProfile = {
  id: 1,
  business_name: "Kampala Roasters Ltd",
  trading_name: "Kampala Roasters",
  owner_name: null,
  email: "hello@kampalaroasters.test",
  phone: "+256 700 123 456",
  tin: "100 234 567",
  registration_number: null,
  address: "12 Market Street",
  city: "Kampala",
  country: "Uganda",
  currency: "UGX",
  timezone: "Africa/Kampala",
  logo_media_ref: null,
  cover_media_ref: null,
  logo_media_url: null,
  cover_media_url: null,
  created_at: "",
  updated_at: "",
};

describe("ReceiptSettingsPreview", () => {
  it("updates the receipt-specific header, footer, width, and copy annotation", () => {
    const { rerender } = render(
      <ReceiptSettingsPreview
        settings={settings}
        businessProfile={businessProfile}
      />,
    );

    rerender(
      <ReceiptSettingsPreview
        settings={{
          ...settings,
          business_header: "A very long example business name for preview",
          footer_message: "Keep this receipt for your records.",
          receipt_width: "58mm",
          copies_per_print: 2,
        }}
        businessProfile={{ ...businessProfile, logo_media_url: "data:image/png;base64,AA==" }}
      />,
    );

    expect(
      screen.getByText("A very long example business name for preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Keep this receipt for your records."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("copies-annotation")).toHaveTextContent(
      "2 copies will print per sale",
    );
    expect(screen.getByTestId("receipt-paper")).toHaveStyle({
      width: "min(100%, 220px)",
    });
  });

  it("uses available Business Profile details when no receipt header override is set", () => {
    render(
      <ReceiptSettingsPreview
        settings={{ ...settings, business_header: "" }}
        businessProfile={businessProfile}
      />,
    );

    expect(screen.getByText("Kampala Roasters")).toBeInTheDocument();
    expect(
      screen.getByText("12 Market Street, Kampala, Uganda"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tel: +256 700 123 456")).toBeInTheDocument();
    expect(screen.getByText("hello@kampalaroasters.test")).toBeInTheDocument();
    expect(screen.getByText("TIN: 100 234 567")).toBeInTheDocument();
  });

  it("uses the persisted Business Profile logo when receipt logos are enabled", () => {
    render(
      <ReceiptSettingsPreview
        settings={{ ...settings, business_header: "" }}
        businessProfile={{ ...businessProfile, logo_media_url: "data:image/png;base64,AA==" }}
      />,
    );

    expect(screen.getByRole("img", { name: "Business logo" })).toHaveAttribute(
      "src",
      "data:image/png;base64,AA==",
    );
    expect(screen.queryByLabelText("Business logo fallback")).not.toBeInTheDocument();
  });

  it("removes optional receipt details when their display settings are disabled", () => {
    render(
      <ReceiptSettingsPreview
        settings={{
          ...settings,
          show_logo: false,
          show_tin: false,
          show_cashier_name: false,
          show_customer_name: false,
          show_payment_method: false,
          show_thank_you_note: false,
          footer_message: "",
        }}
        businessProfile={{ ...businessProfile, logo_media_url: "data:image/png;base64,AA==" }}
      />,
    );

    expect(
      screen.queryByLabelText("Business logo fallback"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Business logo" })).not.toBeInTheDocument();
    expect(screen.queryByText("TIN: 100 234 567")).not.toBeInTheDocument();
    expect(screen.queryByText("Cashier")).not.toBeInTheDocument();
    expect(screen.queryByText("Walk-in customer")).not.toBeInTheDocument();
    expect(screen.queryByText(/Paid · Cash/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Thank you for your purchase!"),
    ).not.toBeInTheDocument();
  });

  it("uses receipt header, then profile identity, then a restrained fallback", () => {
    const { rerender } = render(
      <ReceiptSettingsPreview settings={settings} businessProfile={businessProfile} />,
    );
    expect(screen.getByText("Akili Market")).toBeInTheDocument();

    rerender(
      <ReceiptSettingsPreview
        settings={{ ...settings, business_header: "" }}
        businessProfile={businessProfile}
      />,
    );
    expect(screen.getByText("Kampala Roasters")).toBeInTheDocument();

    rerender(
      <ReceiptSettingsPreview
        settings={{ ...settings, business_header: "" }}
        businessProfile={null}
      />,
    );
    expect(screen.getByText("Your business (preview)")).toBeInTheDocument();
    expect(screen.queryByText(/12 Market Street/)).not.toBeInTheDocument();
  });
});
