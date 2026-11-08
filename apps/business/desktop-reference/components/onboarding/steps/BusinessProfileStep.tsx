import { useState } from "react";
import { useReduxOnboarding } from "@/hooks/useReduxOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconLoader2,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import type { BusinessProfileFormData, SuperUserFormData } from "../OnboardingFlow";

interface BusinessProfileStepProps {
  onNext: () => void;
  onBack?: () => void;
  onFinish: () => void;
  isLastStep: boolean;
  isFirstStep?: boolean;
  superUserForm?: SuperUserFormData;
  setSuperUserForm?: (form: SuperUserFormData) => void;
  businessProfileForm: BusinessProfileFormData;
  setBusinessProfileForm: (form: BusinessProfileFormData) => void;
}

export default function BusinessProfileStep({
  onNext,
  onBack,
  businessProfileForm,
  setBusinessProfileForm,
}: BusinessProfileStepProps) {
  const { setupBusinessProfile } = useReduxOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currencies = ["UGX", "TZS", "USD", "KES", "RWF", "EUR", "GBP"];
  const timezones = [
    "Africa/Kampala",
    "Africa/Dar_es_Salaam",
    "Africa/Nairobi",
    "Africa/Kigali",
  ];

  const updateField = (field: keyof BusinessProfileFormData, value: string) => {
    setBusinessProfileForm({ ...businessProfileForm, [field]: value });
  };

  const handleSubmit = async () => {
    if (!businessProfileForm.business_name) {
      setError("Business name is required");
      return;
    }

    setLoading(true);
    const success = await setupBusinessProfile(businessProfileForm);
    setLoading(false);

    if (success) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Register Your Business Profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your official enterprise details. Providing your trading name
            and TIN helps AkiliBiz structure your invoices, receipt layouts, and
            tax records correctly.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel required htmlFor="business_name">Business Name</FieldLabel>
            <Input
              id="business_name"
              required
              value={businessProfileForm.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              placeholder="My Business Ltd"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trading_name">Trading Name</Label>
              <Input
                id="trading_name"
                value={businessProfileForm.trading_name}
                onChange={(e) => updateField("trading_name", e.target.value)}
                placeholder="My Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                value={businessProfileForm.owner_name}
                onChange={(e) => updateField("owner_name", e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                type="email"
                value={businessProfileForm.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="info@mybusiness.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={businessProfileForm.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+256 123 456 789"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tin">TIN / Tax Number</Label>
              <Input
                id="tin"
                value={businessProfileForm.tin}
                onChange={(e) => updateField("tin", e.target.value)}
                placeholder="Tax identification number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                value={businessProfileForm.registration_number}
                onChange={(e) =>
                  updateField("registration_number", e.target.value)
                }
                placeholder="Business registration number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={businessProfileForm.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Business address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={businessProfileForm.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Kampala"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={businessProfileForm.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="Uganda"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel required>Currency</FieldLabel>
              <Select
                value={businessProfileForm.currency}
                onValueChange={(value) => updateField("currency", value)}>
                <SelectTrigger aria-required="true" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel required>Timezone</FieldLabel>
              <Select
                value={businessProfileForm.timezone}
                onValueChange={(value) => updateField("timezone", value)}>
                <SelectTrigger aria-required="true" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Balanced Action Footer */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/40 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="rounded-full h-11 flex items-center gap-1 text-muted-foreground hover:text-foreground dark:bg-[#121212]">
          <IconChevronLeft className="size-5" />
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-full h-11 px-6 font-medium shadow-md flex items-center gap-1.5 group">
          {loading ? (
            <>
              <IconLoader2 className="mr-1 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <IconChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
