"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ImagePlus,
  Info,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  type BusinessProfileFormData,
  type BrowserBusinessProfile,
  type ProfileMediaKind,
} from "@/components/akilibiz/settings/business-profile-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormProps = {
  isDirty: boolean;
  loading: boolean;
  onRemoveMedia: (kind: ProfileMediaKind) => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  onSetMedia: (kind: ProfileMediaKind, url: string) => void;
  onUpdateField: (field: keyof BusinessProfileFormData, value: string) => void;
  profile: BrowserBusinessProfile;
};

const mediaAccept =
  ".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp";
const formFields = Object.keys({
  address: "",
  business_name: "",
  city: "",
  country: "",
  currency: "",
  email: "",
  owner_name: "",
  phone: "",
  registration_number: "",
  timezone: "",
  tin: "",
  trading_name: "",
}) as Array<keyof BusinessProfileFormData>;

export function BusinessProfileForm({
  isDirty,
  loading,
  onRemoveMedia,
  onReset,
  onSave,
  onSetMedia,
  onUpdateField,
  profile,
}: ProfileFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = React.useState<ProfileMediaKind | null>(
    null,
  );
  const logoInput = React.useRef<HTMLInputElement>(null);
  const coverInput = React.useRef<HTMLInputElement>(null);
  const configuredFields = formFields.filter(
    (field) => profile[field].trim() !== "",
  ).length;
  const isComplete = configuredFields === formFields.length;
  const displayName =
    profile.trading_name || profile.business_name || "Your business";
  const initials =
    displayName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "B";

  const selectMedia = async (kind: ProfileMediaKind, file?: File) => {
    if (!file) return;
    setMediaBusy(kind);
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Unable to read image"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      onSetMedia(kind, source);
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} updated`);
    } catch {
      toast.error(
        `Unable to update the ${kind === "logo" ? "logo" : "cover image"}`,
      );
    } finally {
      setMediaBusy(null);
    }
  };
  const removeMedia = async (kind: ProfileMediaKind) => {
    setMediaBusy(kind);
    try {
      await Promise.resolve();
      onRemoveMedia(kind);
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} removed`);
    } catch {
      toast.error(
        `Unable to remove the ${kind === "logo" ? "logo" : "cover image"}`,
      );
    } finally {
      setMediaBusy(null);
    }
  };
  const mediaAction = (kind: ProfileMediaKind, hasMedia: boolean) => {
    const input = kind === "logo" ? logoInput : coverInput;
    return (
      <Button
        type="button"
        size="sm"
        variant={kind === "cover" ? "secondary" : "outline"}
        onClick={() => input.current?.click()}
        disabled={mediaBusy !== null}
      >
        {mediaBusy === kind ? (
          <LoaderCircle className="mr-2 size-4 animate-spin" />
        ) : hasMedia ? (
          <Pencil className="mr-2 size-4" />
        ) : (
          <ImagePlus className="mr-2 size-4" />
        )}
        {mediaBusy === kind
          ? "Saving…"
          : hasMedia
            ? `Change ${kind}`
            : `Add ${kind}`}
      </Button>
    );
  };
  const field =
    (name: keyof BusinessProfileFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setError(null);
      onUpdateField(name, event.target.value);
    };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setError("Complete the required fields before saving.");
      event.currentTarget.reportValidity();
      return;
    }
    try {
      await onSave();
      setError(null);
      toast.success("Business profile saved");
    } catch {
      setError("Unable to save the business profile. Please try again.");
      toast.error("Unable to save the business profile");
    }
  };

  return (
    <Card className="gap-0 overflow-visible py-0">
      <CardContent className="px-0">
        <section aria-label="Business identity" className="relative">
          <div className="relative z-0 h-32 overflow-hidden rounded-t-xl sm:h-40 md:h-44 lg:h-52">
            {profile.cover_media_url ? (
              <img
                src={profile.cover_media_url}
                alt="Business cover"
                className="size-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
            <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-2">
              {mediaAction("cover", Boolean(profile.cover_media_url))}
              {profile.cover_media_url ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void removeMedia("cover")}
                  disabled={mediaBusy !== null}
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove cover
                </Button>
              ) : null}
            </div>
          </div>
          <div className="relative z-20 mx-4 my-4 flex flex-col gap-4 pb-1 sm:mx-6 sm:flex-row sm:items-end sm:gap-5">
            {profile.logo_media_url ? (
              <img
                src={profile.logo_media_url}
                alt="Business logo"
                className="size-32 rounded-3xl bg-card object-cover shadow-sm sm:size-[104px] lg:size-[128px]"
              />
            ) : (
              <div
                aria-label="Business logo fallback"
                className="flex size-24 items-center justify-center rounded-3xl bg-primary/10 text-2xl font-semibold shadow-sm sm:size-[104px] lg:size-[128px]"
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-xl font-semibold leading-tight">
                  {profile.business_name || "Set up your business"}
                </h2>
                <Badge variant="outline" className="shrink-0">
                  {isComplete ? "Profile complete" : "Profile in progress"}
                </Badge>
              </div>
              {profile.trading_name ? (
                <p className="break-words text-sm text-muted-foreground">
                  Trading as {profile.trading_name}
                </p>
              ) : null}
              <p className="max-w-xl text-sm text-muted-foreground">
                Business identity used across daily operations, receipts, and
                reports.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <Info className="size-4 shrink-0" />
                <p className="text-xs">
                  Logo should be of PNG, JPEG, GIF, or WebP format up to 5 MB.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:items-start sm:pb-1">
              {mediaAction("logo", Boolean(profile.logo_media_url))}
              {profile.logo_media_url ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void removeMedia("logo")}
                  disabled={mediaBusy !== null}
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove logo
                </Button>
              ) : null}
            </div>
          </div>
          <input
            ref={logoInput}
            className="sr-only"
            type="file"
            accept={mediaAccept}
            onChange={(event) =>
              void selectMedia("logo", event.target.files?.[0])
            }
          />
          <input
            ref={coverInput}
            className="sr-only"
            type="file"
            accept={mediaAccept}
            onChange={(event) =>
              void selectMedia("cover", event.target.files?.[0])
            }
          />
        </section>
        <form
          className="space-y-8 px-4 pb-6 pt-8 sm:px-6"
          onSubmit={(event) => void submit(event)}
        >
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <section
            aria-labelledby="business-details-heading"
            className="space-y-4"
          >
            <div>
              <h2
                id="business-details-heading"
                className="text-base font-semibold"
              >
                Business details
              </h2>
              <p className="text-sm text-muted-foreground">
                Use your registered information where it is available.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="business_name">
                  Registered business name
                </FieldLabel>
                <Input
                  id="business_name"
                  required
                  value={profile.business_name}
                  onChange={field("business_name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trading_name">Trading name</Label>
                <Input
                  id="trading_name"
                  value={profile.trading_name}
                  onChange={field("trading_name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner / director</Label>
                <Input
                  id="owner_name"
                  value={profile.owner_name}
                  onChange={field("owner_name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration number</Label>
                <Input
                  id="registration_number"
                  value={profile.registration_number}
                  onChange={field("registration_number")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tin">TIN</Label>
                <Input id="tin" value={profile.tin} onChange={field("tin")} />
              </div>
            </div>
          </section>
          <section
            aria-labelledby="contact-location-heading"
            className="border-t pt-8"
          >
            <div className="mb-4">
              <h2
                id="contact-location-heading"
                className="text-base font-semibold"
              >
                Contact and location
              </h2>
              <p className="text-sm text-muted-foreground">
                Keep the details customers and documents rely on up to date.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Business email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={field("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Business phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={field("phone")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={3}
                  value={profile.address}
                  onChange={field("address")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={field("city")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={profile.country}
                  onChange={field("country")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required htmlFor="timezone">
                  Timezone
                </FieldLabel>
                <Input
                  id="timezone"
                  required
                  value={profile.timezone}
                  onChange={field("timezone")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required htmlFor="currency">
                  Currency
                </FieldLabel>
                <Input
                  id="currency"
                  required
                  value={profile.currency}
                  onChange={field("currency")}
                />
              </div>
            </div>
          </section>
          <aside className="flex gap-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              Logo and cover image will be used on future marketplace and vendor
              listings.
            </p>
          </aside>
          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Changes appear on receipts and reports.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={loading || !isDirty}
              >
                <RotateCcw className="mr-2 size-4" />
                Reset changes
              </Button>
              <Button
                type="submit"
                disabled={loading || !isDirty}
                className="lg:w-sm"
              >
                {loading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : null}
                {loading ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
