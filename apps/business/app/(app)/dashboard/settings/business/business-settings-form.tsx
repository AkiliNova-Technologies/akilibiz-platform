"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { updateBusinessProfile } from "@/app/(app)/dashboard/business-actions";
import { initialBusinessFormState } from "@/lib/business-form-state";
import { BusinessProfileFields } from "@/app/(app)/dashboard/business-profile-fields";
import type { BusinessProfileInput } from "@/lib/business-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/akilibiz/status-banner";

export function BusinessSettingsForm({
  initial,
  canEdit,
}: {
  initial: BusinessProfileInput;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateBusinessProfile, initialBusinessFormState);
  const initials = (initial.tradingName || initial.name).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "B";
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="space-y-6 px-0 pb-6">
        <section aria-label="Business identity" className="space-y-4">
          <div className="relative h-32 bg-primary/10 sm:h-40 md:h-44 lg:h-52">
            <Button type="button" variant="secondary" size="sm" disabled
              title="Business cover images are not yet connected" className="absolute bottom-3 right-3">
              <ImagePlus className="size-4" /> Add cover
            </Button>
          </div>
          <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-end sm:px-6">
            <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-2xl font-semibold sm:size-28">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-semibold">{initial.name}</h2>
              {initial.tradingName && <p className="text-sm text-muted-foreground">Trading as {initial.tradingName}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Business identity used on receipts and reports.</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled title="Business logo upload is not yet connected">
              <ImagePlus className="size-4" /> Add logo
            </Button>
          </div>
        </section>
        <div className="space-y-6 px-4 sm:px-6">
        {!canEdit ? <StatusBanner title="Read-only business profile" tone="info">
          Only an owner can change business details.
        </StatusBanner> : null}
        <form action={action} className="space-y-6">
          <fieldset disabled={!canEdit || pending} className="space-y-6">
            <BusinessProfileFields defaults={initial} />
          </fieldset>
          {state.error ? <StatusBanner title="Could not save business profile" tone="error">{state.error}</StatusBanner> : state.saved ? <StatusBanner title="Business profile saved" tone="success">Your changes were saved for this business.</StatusBanner> : null}
          {canEdit ? <div className="flex justify-end border-t pt-5">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </div> : null}
        </form>
        </div>
      </CardContent>
    </Card>
  );
}
