import * as React from "react";
import MetricCard from "@/components/metric-card";
import { ReceiptSettingsPreview } from "@/components/documents/ReceiptSettingsPreview";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReduxSettings } from "@/hooks/useReduxSettings";
import {
  IconPrinter,
  IconReceipt2,
  IconSettings,
  IconTextSize,
} from "@tabler/icons-react";
import { printProfiles, type PrintProfileId } from "@/services/receipt-print-profiles";

const emptySettings = {
  business_header: "",
  footer_message: "",
  show_logo: false,
  show_tin: true,
  show_cashier_name: true,
  show_customer_name: true,
  show_payment_method: true,
  show_thank_you_note: true,
  receipt_width: "80mm",
  print_profile: "thermal-80mm" as PrintProfileId,
  copies_per_print: 1,
  auto_print_after_sale: false,
};

export default function SettingsReceiptPage() {
  const {
    businessProfile,
    receiptSettings,
    loading,
    error,
    getReceiptSettings,
    getBusinessProfile,
    saveReceiptSettings,
    clearError,
  } = useReduxSettings();
  const [formData, setFormData] = React.useState(emptySettings);

  const toggleOptions: Array<[keyof typeof formData, string]> = [
    ["show_logo", "Show Logo"],
    ["show_tin", "Show TIN"],
    ["show_cashier_name", "Show Cashier Name"],
    ["show_customer_name", "Show Customer Name"],
    ["show_payment_method", "Show Payment Method"],
    ["show_thank_you_note", "Show Thank You Note"],
    ["auto_print_after_sale", "Auto Print After Sale"],
  ];

  const hydrateForm = React.useCallback(() => {
    if (!receiptSettings) return;
    setFormData({
      business_header: receiptSettings.business_header ?? "",
      footer_message: receiptSettings.footer_message ?? "",
      show_logo: receiptSettings.show_logo,
      show_tin: receiptSettings.show_tin,
      show_cashier_name: receiptSettings.show_cashier_name,
      show_customer_name: receiptSettings.show_customer_name,
      show_payment_method: receiptSettings.show_payment_method,
      show_thank_you_note: receiptSettings.show_thank_you_note,
      receipt_width: receiptSettings.receipt_width ?? "80mm",
      print_profile: receiptSettings.print_profile ?? "thermal-80mm",
      copies_per_print: receiptSettings.copies_per_print ?? 1,
      auto_print_after_sale: receiptSettings.auto_print_after_sale,
    });
  }, [receiptSettings]);

  React.useEffect(() => {
    getReceiptSettings();
    getBusinessProfile();
  }, [getBusinessProfile, getReceiptSettings]);

  React.useEffect(() => {
    hydrateForm();
  }, [hydrateForm]);

  React.useEffect(() => () => clearError(), [clearError]);

  const handleSave = async () => {
    await saveReceiptSettings({
      business_header: formData.business_header,
      footer_message: formData.footer_message || null,
      show_logo: formData.show_logo,
      show_tin: formData.show_tin,
      show_cashier_name: formData.show_cashier_name,
      show_customer_name: formData.show_customer_name,
      show_payment_method: formData.show_payment_method,
      show_thank_you_note: formData.show_thank_you_note,
      receipt_width: formData.receipt_width,
      print_profile: formData.print_profile,
      copies_per_print: Number(formData.copies_per_print),
      auto_print_after_sale: formData.auto_print_after_sale,
    });
  };

  const toggleField = (field: keyof typeof formData) => {
    if (typeof formData[field] !== "boolean") return;
    setFormData((previous) => ({ ...previous, [field]: !previous[field] }));
  };

  const settings = receiptSettings ?? emptySettings;
  const enabledOptions = Object.values(settings).filter(
    (value) => typeof value === "boolean" && value,
  ).length;

  return (
    <>
      <SiteHeader label="Receipt Settings" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Receipt Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how receipts are displayed and printed.
            </p>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Receipt Width"
              value={settings.receipt_width}
              description="Configured print paper width"
              icon={<IconReceipt2 className="size-5" />}
            />
            <MetricCard
              title="Copies Per Print"
              value={String(settings.copies_per_print)}
              description="Number of copies per transaction"
              icon={<IconPrinter className="size-5" />}
            />
            <MetricCard
              title="Enabled Options"
              value={String(enabledOptions)}
              description="Receipt features enabled"
              icon={<IconSettings className="size-5" />}
            />
            <MetricCard
              title="Header"
              value={settings.business_header || "Not Set"}
              description="Receipt title"
              icon={<IconTextSize className="size-5" />}
            />
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
            <Card>
              <CardContent className="px-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Receipt Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Control receipt content, printing behavior, and display
                      options. The preview updates before settings are saved.
                    </p>
                  </div>
                  <div className="grid gap-4 py-2 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel htmlFor="business_header">
                        Business Header
                      </FieldLabel>
                      <Input
                        id="business_header"
                        value={formData.business_header}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            business_header: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required htmlFor="print_profile">
                        Print Format
                      </FieldLabel>
                      <Select
                        value={formData.print_profile}
                        onValueChange={(value) => {
                          const profile = printProfiles[value as PrintProfileId];
                          setFormData((previous) => ({
                            ...previous,
                            print_profile: profile.id,
                            receipt_width:
                              profile.paper === "A4" ? "A4" : profile.paper,
                          }));
                        }}
                      >
                        <SelectTrigger id="print_profile" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(printProfiles).map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.label} — {profile.intendedUse}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required htmlFor="copies_per_print">
                        Copies Per Print
                      </FieldLabel>
                      <Input
                        id="copies_per_print"
                        required
                        type="number"
                        min="1"
                        value={formData.copies_per_print}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            copies_per_print: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="footer_message">Footer Message</Label>
                      <Textarea
                        id="footer_message"
                        rows={4}
                        value={formData.footer_message}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            footer_message: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
                      {toggleOptions.map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={Boolean(formData[key])}
                          onClick={() => toggleField(key)}
                          className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="text-sm font-medium">{label}</span>
                          <Badge
                            variant={formData[key] ? "outline" : "secondary"}>
                            {formData[key] ? "Enabled" : "Disabled"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={hydrateForm}
                      disabled={!receiptSettings}>
                      Reset changes
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="xl:sticky xl:top-6">
              <CardContent className="px-4 sm:px-6">
                <ReceiptSettingsPreview
                  settings={formData}
                  businessProfile={businessProfile}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
