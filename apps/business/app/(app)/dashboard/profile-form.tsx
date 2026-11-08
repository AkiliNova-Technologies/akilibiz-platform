"use client";

import { useActionState, useState } from "react";

import { AkiliButton } from "@/components/akilibiz/akili-button";
import { StatusBanner } from "@/components/akilibiz/status-banner";

import type { BusinessProfileInput } from "@/lib/business-profile";
import { BusinessProfileFields } from "./business-profile-fields";
import { updateBusinessProfile } from "./business-actions";
import { initialBusinessFormState } from "@/lib/business-form-state";

export function ProfileForm({ defaults }: { defaults: BusinessProfileInput }) {
  const [state, formAction, isPending] = useActionState(
    updateBusinessProfile,
    initialBusinessFormState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const showSuccess = hasSubmitted && !isPending && !state.error;

  return (
    <form
      action={formAction}
      className="space-y-8"
      onSubmit={() => {
        setHasSubmitted(true);
      }}
    >
      <BusinessProfileFields defaults={defaults} />
      {state.error ? (
        <StatusBanner title="We could not save your changes" tone="error">
          {state.error}
        </StatusBanner>
      ) : null}
      {showSuccess ? (
        <StatusBanner title="Changes saved" tone="success">
          Your business profile has been updated.
        </StatusBanner>
      ) : null}
      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          Changes appear across your business profile after they are saved.
        </p>
        <AkiliButton
          className="h-10 w-full shrink-0 sm:w-auto"
          disabled={isPending}
          loading={isPending}
          type="submit"
        >
          {isPending ? "Saving profile…" : "Save business profile"}
        </AkiliButton>
      </div>
    </form>
  );
}
