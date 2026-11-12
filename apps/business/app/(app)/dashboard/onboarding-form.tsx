"use client";

import { useActionState, useState } from "react";
import { AkiliButton } from "@/components/akilibiz/akili-button";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { OnboardingStepper } from "@/components/akilibiz/onboarding-stepper";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onboardBusiness } from "./business-actions";
import { initialBusinessFormState } from "@/lib/business-form-state";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(onboardBusiness, initialBusinessFormState);
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [name, setName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const pill = "h-11 rounded-full px-4";

  function continueSetup() {
    if (step === 2 && !name.trim()) return;
    if (step < 4) setStep((step + 1) as 3 | 4);
  }

  return <div className="w-full max-w-md space-y-7">
    <OnboardingStepper current={step}/>
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight">
        {step === 2 ? "Tell us about your business" : step === 3 ? "Business contact details" : "You're almost ready"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {step === 2 ? "Start with the essentials. You can update these details later." :
          step === 3 ? "Add a way for customers to reach your business." : "Review your details and create your business."}
      </p>
    </div>
    <form action={formAction} className="space-y-6">
      <div className={step === 2 ? "space-y-4" : "hidden"} aria-hidden={step !== 2}>
        <AkiliFormField id="new-business-name" label="Business name">
          <Input id="new-business-name" name="name" value={name} onChange={e => setName(e.target.value)}
            maxLength={160} className={pill} required={step === 2} placeholder="e.g. Kampala Stores"/>
        </AkiliFormField>
        <AkiliFormField id="new-trading-name" label="Trading name" optional>
          <Input id="new-trading-name" name="tradingName" value={tradingName} maxLength={160}
            onChange={e => setTradingName(e.target.value)} className={pill}/>
        </AkiliFormField>
      </div>
      <div className={step === 3 ? "space-y-4" : "hidden"} aria-hidden={step !== 3}>
        <AkiliFormField id="new-contact-phone" label="Phone number" optional>
          <Input id="new-contact-phone" name="contactPhone" type="tel" maxLength={32} value={phone}
            onChange={e => setPhone(e.target.value)} className={pill} placeholder="+256"/>
        </AkiliFormField>
        <AkiliFormField id="new-contact-email" label="Business email" optional>
          <Input id="new-contact-email" name="contactEmail" type="email" maxLength={320} value={email}
            onChange={e => setEmail(e.target.value)} className={pill}/>
        </AkiliFormField>
      </div>
      <div className={step === 4 ? "space-y-5" : "hidden"} aria-hidden={step !== 4}>
        <section aria-label="Business summary" className="space-y-3 rounded-xl bg-muted/40 px-4 py-4">
          <h3 className="text-sm font-semibold">Business details</h3>
          <dl className="space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Business name</dt>
              <dd className="break-words font-medium">{name || "—"}</dd>
            </div>
            {tradingName ? (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Trading name</dt>
                <dd className="break-words font-medium">{tradingName}</dd>
              </div>
            ) : null}
            {phone.trim() ? (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Phone number</dt>
                <dd className="break-words font-medium">{phone}</dd>
              </div>
            ) : null}
            {email.trim() ? (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Business email</dt>
                <dd className="break-all font-medium">{email}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <AkiliFormField id="new-currency" label="Currency">
          <Select value={currency} onValueChange={setCurrency} disabled={isPending}>
            <SelectTrigger id="new-currency" className="h-11 w-full rounded-full px-4" aria-label="Currency">
              <SelectValue placeholder="Choose currency" />
            </SelectTrigger>
            <SelectContent align="start">
              {["UGX", "KES", "TZS", "RWF", "USD", "GBP"].map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AkiliFormField>
      </div>
      <input type="hidden" name="currencyCode" value={currency} />
      <input type="hidden" name="locale" value="en-UG"/>
      <input type="hidden" name="timeZone" value="Africa/Kampala"/>
      {state.error ? <StatusBanner title="Could not create business" tone="error">{state.error}</StatusBanner> : null}
      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" className="h-11 rounded-full px-6"
          onClick={() => setStep((step - 1) as 2 | 3)} disabled={step === 2 || isPending}>Back</Button>
        {step < 4 ?
          <Button type="button" className="h-11 flex-1 rounded-full" onClick={continueSetup} disabled={step === 2 && !name.trim()}>Continue</Button> :
          <AkiliButton type="submit" className="h-11 flex-1 rounded-full" disabled={isPending} loading={isPending}>
            {isPending ? "Creating business…" : "Create business"}
          </AkiliButton>}
      </div>
    </form>
  </div>;
}
