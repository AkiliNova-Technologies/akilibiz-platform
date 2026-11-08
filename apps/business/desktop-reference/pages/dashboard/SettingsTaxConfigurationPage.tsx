import * as React from "react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useReduxSettings } from "@/hooks/useReduxSettings";
import { useReduxTax } from "@/hooks/useReduxTax";
import { getErrorMessage } from "@/utils/error-message";

const emptyTaxConfig = {
  default_tax_name: "VAT",
  default_tax_rate: 0,
  tax_number: "",
  apply_tax_on_sales: true,
  apply_tax_on_services: true,
  tax_inclusive_pricing: false,
  show_tax_on_receipt: true,
  tax_rounding_mode: "nearest",
};

type TaxToggleField =
  | "apply_tax_on_sales"
  | "apply_tax_on_services"
  | "tax_inclusive_pricing"
  | "show_tax_on_receipt";

function Toggle({
  field,
  label,
  enabled,
  onToggle,
}: {
  field: TaxToggleField;
  label: string;
  enabled: boolean;
  onToggle: (field: TaxToggleField) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => onToggle(field)}
      className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40">
      <span className="text-sm font-medium">{label}</span>
      <Badge variant={enabled ? "outline" : "secondary"}>
        {enabled ? "Enabled" : "Disabled"}
      </Badge>
    </button>
  );
}

export default function SettingsTaxConfigurationPage() {
  const settingsStore = useReduxSettings();
  const taxStore = useReduxTax();
  const getTaxConfig = settingsStore.getTaxConfig;
  const getTaxSettings = taxStore.getTaxSettings;
  const clearSettingsError = settingsStore.clearError;
  const clearTaxError = taxStore.clearError;
  const [formData, setFormData] = React.useState(emptyTaxConfig);
  const [taxSettingsForm, setTaxSettingsForm] = React.useState({
    vat_registered: false,
    vat_registration_number: "",
    tax_inclusive_pricing: false,
    tax_rounding_mode: "nearest",
  });
  const [saveError, setSaveError] = React.useState("");
  const [saveSuccess, setSaveSuccess] = React.useState("");

  const hydrateForm = React.useCallback(() => {
    const config = settingsStore.taxConfig ?? emptyTaxConfig;
    setFormData({
      default_tax_name: config.default_tax_name ?? "VAT",
      default_tax_rate: config.default_tax_rate ?? 0,
      tax_number: config.tax_number ?? "",
      apply_tax_on_sales: config.apply_tax_on_sales,
      apply_tax_on_services: config.apply_tax_on_services,
      tax_inclusive_pricing: config.tax_inclusive_pricing,
      show_tax_on_receipt: config.show_tax_on_receipt,
      tax_rounding_mode: config.tax_rounding_mode ?? "nearest",
    });
    if (taxStore.settings)
      setTaxSettingsForm({
        vat_registered: taxStore.settings.vat_registered,
        vat_registration_number:
          taxStore.settings.vat_registration_number || "",
        tax_inclusive_pricing: taxStore.settings.tax_inclusive_pricing,
        tax_rounding_mode: taxStore.settings.tax_rounding_mode || "nearest",
      });
  }, [settingsStore.taxConfig, taxStore.settings]);

  React.useEffect(() => {
    getTaxConfig();
    getTaxSettings();
  }, [getTaxConfig, getTaxSettings]);
  React.useEffect(() => {
    hydrateForm();
  }, [hydrateForm]);
  React.useEffect(
    () => () => {
      clearSettingsError();
      clearTaxError();
    },
    [clearSettingsError, clearTaxError],
  );

  const saving = settingsStore.loading || taxStore.loading;
  const formError = saveError || settingsStore.error || taxStore.error;
  const setTaxSetting = <Key extends keyof typeof taxSettingsForm>(
    key: Key,
    value: (typeof taxSettingsForm)[Key],
  ) => setTaxSettingsForm((previous) => ({ ...previous, [key]: value }));
  const toggle = (key: TaxToggleField) =>
    setFormData((previous) => ({ ...previous, [key]: !previous[key] }));
  const save = async () => {
    setSaveError("");
    setSaveSuccess("");
    try {
      await settingsStore.saveTaxConfig({
        ...formData,
        default_tax_rate: Number(formData.default_tax_rate),
        tax_number: formData.tax_number || null,
      });
      await taxStore.saveTaxSettings({
        vat_registered: taxSettingsForm.vat_registered,
        vat_registration_number:
          taxSettingsForm.vat_registration_number || null,
        tax_inclusive_pricing: taxSettingsForm.tax_inclusive_pricing,
        tax_rounding_mode: taxSettingsForm.tax_rounding_mode,
      });
      setSaveSuccess("Tax settings saved.");
    } catch (error) {
      setSaveError(
        getErrorMessage(
          error,
          "We could not save your tax settings. Your changes are still shown below.",
        ),
      );
    }
  };
  return (
    <>
      <SiteHeader label="Tax Settings" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Tax Settings</h2>
            <p className="text-sm text-muted-foreground">
              Choose how AkiliBiz records and shows tax on your sales and
              services.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              AkiliBiz records tax information but does not file tax returns or
              submit information to URA or EFRIS.
            </p>
          </div>
          {formError && (
            <div role="alert" className="text-sm text-destructive">
              {formError}
            </div>
          )}
          {saveSuccess && (
            <div role="status" className="text-sm text-emerald-700">
              {saveSuccess}
            </div>
          )}
          <Card>
            <CardContent className="px-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Tax configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your tax details and choose where the default tax
                    applies.
                  </p>
                </div>
                <section className="space-y-3">
                  <h4 className="font-medium">VAT registration</h4>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-2">
                      <Label className="font-medium">Registered for VAT</Label>
                      <p className="text-xs text-muted-foreground">
                        Turn this on if your business is registered for VAT.
                      </p>
                    </div>
                    <Switch
                      checked={taxSettingsForm.vat_registered}
                      onCheckedChange={(checked) =>
                        setTaxSetting("vat_registered", checked)
                      }
                    />
                  </div>
                </section>
                <section className="space-y-3">
                  <h4 className="font-medium">VAT registration details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {taxSettingsForm.vat_registered && (
                      <div className="space-y-2">
                        <Label htmlFor="vat_registration_number">
                          VAT registration number
                        </Label>
                        <Input
                          id="vat_registration_number"
                          value={taxSettingsForm.vat_registration_number}
                          onChange={(event) =>
                            setTaxSetting(
                              "vat_registration_number",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="tax_number">
                        Business tax identification number (if different)
                      </Label>
                      <Input
                        id="tax_number"
                        value={formData.tax_number}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            tax_number: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>
                <section className="space-y-3">
                  <h4 className="font-medium">Default tax name and rate</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel required htmlFor="default_tax_name">
                        Tax name shown to customers
                      </FieldLabel>
                      <Input
                        id="default_tax_name"
                        required
                        value={formData.default_tax_name}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            default_tax_name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-4">
                      <FieldLabel htmlFor="default_tax_rate">
                        Default tax rate (%)
                      </FieldLabel>
                      <Input
                        id="default_tax_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.default_tax_rate}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            default_tax_rate: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>
                <section className="space-y-3">
                  <h4 className="font-medium">Where default tax applies</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      field="apply_tax_on_sales"
                      label="Charge the default tax on goods sold"
                      enabled={formData.apply_tax_on_sales}
                      onToggle={toggle}
                    />
                    <Toggle
                      field="apply_tax_on_services"
                      label="Charge the default tax on services"
                      enabled={formData.apply_tax_on_services}
                      onToggle={toggle}
                    />
                  </div>
                </section>
                <section className="space-y-3">
                  <h4 className="font-medium">
                    Prices, receipts, and rounding
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      field="tax_inclusive_pricing"
                      label="Prices already include tax"
                      enabled={formData.tax_inclusive_pricing}
                      onToggle={toggle}
                    />
                    <Toggle
                      field="show_tax_on_receipt"
                      label="Show tax on receipts"
                      enabled={formData.show_tax_on_receipt}
                      onToggle={toggle}
                    />
                  </div>
                  <div className="max-w-sm space-y-2">
                    <FieldLabel required htmlFor="tax_rounding_mode">
                      Tax rounding
                    </FieldLabel>
                    {/* TODO: Help me make this a shadcn select input */}
                    <Input
                      id="tax_rounding_mode"
                      required
                      value={formData.tax_rounding_mode}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFormData((previous) => ({
                          ...previous,
                          tax_rounding_mode: value,
                        }));
                        setTaxSetting("tax_rounding_mode", value);
                      }}
                      placeholder="nearest"
                    />
                  </div>
                </section>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={hydrateForm}
                    disabled={saving}>
                    Reset changes
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Saving tax settings…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
