"use client";

import { BusinessProfileForm } from "@/components/akilibiz/settings/business-profile-form";
import { useBrowserBusinessProfile } from "@/components/akilibiz/settings/business-profile-data";

export default function BusinessSettingsPage() {
  const profile = useBrowserBusinessProfile();

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Business Profile
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage the information shown on receipts, reports, and future
            marketplace listings.
          </p>
        </div>
        <BusinessProfileForm
          isDirty={profile.isDirty}
          loading={profile.loading}
          onRemoveMedia={profile.removeMedia}
          onReset={profile.reset}
          onSave={profile.save}
          onSetMedia={profile.setMedia}
          onUpdateField={profile.updateField}
          profile={profile.profile}
        />
      </div>
    </main>
  );
}
