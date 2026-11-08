"use client";

import { useActionState } from "react";

import { AkiliButton } from "@/components/akilibiz/akili-button";
import { ProductPageHeader } from "@/components/akilibiz/product-page-header";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { BusinessProfileFields } from "./business-profile-fields";
import { onboardBusiness } from "./business-actions";
import { initialBusinessFormState } from "@/lib/business-form-state";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    onboardBusiness,
    initialBusinessFormState,
  );

  return (
    <Card className="max-w-3xl border-brand-200">
      <CardHeader className="border-b border-brand-100 bg-brand-50/40">
        <ProductPageHeader
          description="Add the essentials now. You can return to this profile whenever your details change."
          display
          eyebrow="Get started"
          title="Set up your first business"
        />
      </CardHeader>
      <CardContent className="space-y-7">
        <StatusBanner title="Start with the essentials" tone="info">
          You will be set up as the business owner and can update these details
          later.
        </StatusBanner>
        <form action={formAction} className="space-y-8">
          <BusinessProfileFields />
          {state.error ? (
            <StatusBanner
              title="We could not create your business"
              tone="error"
            >
              {state.error}
            </StatusBanner>
          ) : null}
          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              Your business details are available only to people with access to
              this business.
            </p>
            <AkiliButton
              className="h-10 w-full shrink-0 sm:w-auto"
              disabled={isPending}
              loading={isPending}
              type="submit"
            >
              {isPending ? "Creating business…" : "Create business"}
            </AkiliButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
