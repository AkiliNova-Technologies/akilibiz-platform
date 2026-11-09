import type { BusinessProfileInput } from "@/lib/business-profile";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type BusinessProfileFieldsProps = {
  defaults?: BusinessProfileInput;
};

export function BusinessProfileFields({
  defaults = {
    name: "",
    tradingName: null,
    contactEmail: null,
    contactPhone: null,
    locale: "en-UG",
    timeZone: "Africa/Kampala",
    currencyCode: "UGX",
  },
}: BusinessProfileFieldsProps) {
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="business-identity-heading"
        className="space-y-5"
      >
        <div>
          <h2
            id="business-identity-heading"
            className="text-base font-semibold text-ink-900"
          >
            Business identity
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use the registered name and customer-facing trading name your team
            recognises.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <AkiliFormField id="business-name" label="Business name">
            <Input
              className="h-11"
              defaultValue={defaults.name}
              id="business-name"
              maxLength={160}
              name="name"
              required
            />
          </AkiliFormField>
          <AkiliFormField id="trading-name" label="Trading name" optional>
            <Input
              className="h-11"
              defaultValue={defaults.tradingName ?? ""}
              id="trading-name"
              maxLength={160}
              name="tradingName"
            />
          </AkiliFormField>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <AkiliFormField id="owner-name" label="Owner / director" optional>
            <Input id="owner-name" disabled placeholder="Not yet available" title="Owner details are not connected" />
          </AkiliFormField>
          <AkiliFormField id="registration-number" label="Registration number" optional>
            <Input id="registration-number" disabled placeholder="Not yet available" title="Business registration details are not connected" />
          </AkiliFormField>
          <AkiliFormField id="business-tin" label="TIN" optional>
            <Input id="business-tin" disabled placeholder="Not yet available" title="Tax identification details are not connected" />
          </AkiliFormField>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="contact-details-heading" className="space-y-5">
        <div>
          <h2
            id="contact-details-heading"
            className="text-base font-semibold text-ink-900"
          >
            Contact details
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Keep the details customers and team members use to reach your
            business up to date.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <AkiliFormField id="contact-email" label="Contact email" optional>
            <Input
              className="h-11"
              defaultValue={defaults.contactEmail ?? ""}
              id="contact-email"
              maxLength={320}
              name="contactEmail"
              type="email"
            />
          </AkiliFormField>
          <AkiliFormField id="contact-phone" label="Contact phone" optional>
            <Input
              className="h-11"
              defaultValue={defaults.contactPhone ?? ""}
              id="contact-phone"
              maxLength={32}
              name="contactPhone"
              type="tel"
            />
          </AkiliFormField>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <AkiliFormField id="business-address" label="Address" optional>
            <Input id="business-address" disabled placeholder="Not yet available" title="Business address is not connected" />
          </AkiliFormField>
          <AkiliFormField id="business-city" label="City" optional>
            <Input id="business-city" disabled placeholder="Not yet available" title="Business city is not connected" />
          </AkiliFormField>
          <AkiliFormField id="business-country" label="Country" optional>
            <Input id="business-country" disabled placeholder="Not yet available" title="Business country is not connected" />
          </AkiliFormField>
        </div>
      </section>

      <Separator />

      <section
        aria-labelledby="regional-preferences-heading"
        className="space-y-5"
      >
        <div>
          <h2
            id="regional-preferences-heading"
            className="text-base font-semibold text-ink-900"
          >
            Regional preferences
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            These preferences help AkiliBiz present dates, times, and currency
            consistently for your business.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <AkiliFormField id="locale" label="Locale">
            <Input
              className="h-11"
              defaultValue={defaults.locale}
              id="locale"
              maxLength={35}
              name="locale"
              required
            />
          </AkiliFormField>
          <AkiliFormField id="time-zone" label="Time zone">
            <Input
              className="h-11"
              defaultValue={defaults.timeZone}
              id="time-zone"
              maxLength={63}
              name="timeZone"
              required
            />
          </AkiliFormField>
          <AkiliFormField id="currency-code" label="Currency code">
            <Input
              className="h-11 uppercase"
              defaultValue={defaults.currencyCode}
              id="currency-code"
              maxLength={3}
              name="currencyCode"
              required
            />
          </AkiliFormField>
        </div>
      </section>
    </div>
  );
}
