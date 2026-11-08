"use client";

import { useActionState } from "react";
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
  return (
    <Card>
      <CardContent className="space-y-6 py-6">
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
      </CardContent>
    </Card>
  );
}
