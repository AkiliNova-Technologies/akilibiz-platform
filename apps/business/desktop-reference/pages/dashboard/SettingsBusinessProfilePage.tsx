import * as React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IconInfoCircle,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react";
import { useReduxSettings } from "@/hooks/useReduxSettings";
import {
  tauriSettingsService,
  type BusinessProfile,
} from "@/services/tauri/settings";

interface BusinessProfileFormData {
  business_name: string;
  trading_name: string;
  owner_name: string;
  email: string;
  phone: string;
  tin: string;
  registration_number: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
}

const emptyForm: BusinessProfileFormData = {
  business_name: "",
  trading_name: "",
  owner_name: "",
  email: "",
  phone: "",
  tin: "",
  registration_number: "",
  address: "",
  city: "",
  country: "",
  currency: "UGX",
  timezone: "Africa/Kampala",
};

function profileToForm(profile: BusinessProfile): BusinessProfileFormData {
  return {
    business_name: profile.business_name ?? "",
    trading_name: profile.trading_name ?? "",
    owner_name: profile.owner_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    tin: profile.tin ?? "",
    registration_number: profile.registration_number ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    currency: profile.currency ?? "UGX",
    timezone: profile.timezone ?? "Africa/Kampala",
  };
}

export default function SettingsBusinessProfilePage() {
  const {
    businessProfile,
    loading,
    error,
    getBusinessProfile,
    saveBusinessProfile,
    clearError,
  } = useReduxSettings();
  const [formData, setFormData] =
    React.useState<BusinessProfileFormData>(emptyForm);
  const [mediaBusy, setMediaBusy] = React.useState<"logo" | "cover" | null>(
    null,
  );
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    getBusinessProfile();
  }, [getBusinessProfile]);
  React.useEffect(() => {
    if (businessProfile) setFormData(profileToForm(businessProfile));
  }, [businessProfile]);
  React.useEffect(() => () => clearError(), [clearError]);
  React.useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  const profile = businessProfile ?? {
    ...emptyForm,
    id: 0,
    created_at: "",
    updated_at: "",
    logo_media_ref: null,
    cover_media_ref: null,
    logo_media_url: null,
    cover_media_url: null,
  };
  const initialForm = businessProfile
    ? profileToForm(businessProfile)
    : emptyForm;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialForm);
  const configuredFields = Object.values(initialForm).filter(
    (value) => value.trim() !== "",
  ).length;
  const isComplete = configuredFields === Object.keys(emptyForm).length;
  const displayName =
    profile.trading_name || profile.business_name || "Your business";
  const initials =
    displayName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "B";

  const updateField = (field: keyof BusinessProfileFormData, value: string) => {
    setSaved(false);
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const handleSave = async () => {
    try {
      await saveBusinessProfile({
        business_name: formData.business_name,
        trading_name: formData.trading_name || null,
        owner_name: formData.owner_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        tin: formData.tin || null,
        registration_number: formData.registration_number || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
        currency: formData.currency,
        timezone: formData.timezone,
      });
      setSaved(true);
    } catch {
      /* The settings hook presents the failure toast and retains the edited form. */
    }
  };
  const chooseMedia = async (kind: "logo" | "cover") => {
    const source = await open({
      multiple: false,
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
      ],
    });
    if (!source || Array.isArray(source)) return;
    setMediaBusy(kind);
    try {
      await tauriSettingsService.uploadBusinessProfileMedia(kind, source);
      await getBusinessProfile();
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} updated`);
    } catch {
      toast.error(
        `Unable to update the ${kind === "logo" ? "logo" : "cover image"}`,
      );
    } finally {
      setMediaBusy(null);
    }
  };
  const removeMedia = async (kind: "logo" | "cover") => {
    setMediaBusy(kind);
    try {
      await tauriSettingsService.removeBusinessProfileMedia(kind);
      await getBusinessProfile();
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} removed`);
    } catch {
      toast.error(
        `Unable to remove the ${kind === "logo" ? "logo" : "cover image"}`,
      );
    } finally {
      setMediaBusy(null);
    }
  };
  const mediaAction = (kind: "logo" | "cover", hasMedia: boolean) => (
    <Button
      type="button"
      size="sm"
      variant={kind === "cover" ? "secondary" : "outline"}
      onClick={() => void chooseMedia(kind)}
      disabled={mediaBusy !== null}>
      {mediaBusy === kind ? (
        <IconLoader2 className="mr-2 size-4 animate-spin" />
      ) : hasMedia ? (
        <IconPencil className="mr-2 size-4" />
      ) : (
        <IconPhoto className="mr-2 size-4" />
      )}
      {mediaBusy === kind
        ? "Saving…"
        : hasMedia
          ? `Change ${kind}`
          : `Add ${kind}`}
    </Button>
  );

  return (
    <>
      <SiteHeader label="Business Profile" />
      <main className="flex flex-1 flex-col px-4 pb-8 md:px-6">
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
                    {mediaAction("cover", Boolean(profile.cover_media_ref))}
                    {profile.cover_media_ref && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void removeMedia("cover")}
                        disabled={mediaBusy !== null}>
                        <IconTrash className="mr-2 size-4" />
                        Remove cover
                      </Button>
                    )}
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
                      className="flex size-24 items-center justify-center rounded-3xl bg-primary/10 text-2xl font-semibold shadow-sm sm:size-[104px] lg:size-[128px]">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2 sm:pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 break-words text-xl font-semibold leading-tight">
                        {profile.business_name || "Set up your business"}
                      </h2>
                      <Badge variant="outline" className="shrink-0">
                        {isComplete
                          ? "Profile complete"
                          : "Profile in progress"}
                      </Badge>
                    </div>
                    {profile.trading_name && (
                      <p className="break-words text-sm text-muted-foreground">
                        Trading as {profile.trading_name}
                      </p>
                    )}
                    <p className="max-w-xl text-sm text-muted-foreground">
                      Business identity used across daily operations, receipts,
                      and reports.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <IconInfoCircle className=" size-4 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Logo should be of PNG, JPEG, GIF, or WebP format up to 5 MB.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:pb-1 items-start">
                    {mediaAction("logo", Boolean(profile.logo_media_ref))}
                    {profile.logo_media_ref && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void removeMedia("logo")}
                        disabled={mediaBusy !== null}>
                        <IconTrash className="mr-2 size-4" />
                        Remove logo
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <form
                className="space-y-8 px-4 pb-6 pt-8 sm:px-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSave();
                }}>
                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <section
                  aria-labelledby="business-details-heading"
                  className="space-y-4">
                  <div>
                    <h2
                      id="business-details-heading"
                      className="text-base font-semibold">
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
                        value={formData.business_name}
                        onChange={(event) =>
                          updateField("business_name", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trading_name">Trading name</Label>
                      <Input
                        id="trading_name"
                        value={formData.trading_name}
                        onChange={(event) =>
                          updateField("trading_name", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner_name">Owner / director</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(event) =>
                          updateField("owner_name", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration_number">
                        Registration number
                      </Label>
                      <Input
                        id="registration_number"
                        value={formData.registration_number}
                        onChange={(event) =>
                          updateField("registration_number", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="tin">TIN</Label>
                      <Input
                        id="tin"
                        value={formData.tin}
                        onChange={(event) =>
                          updateField("tin", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>
                <section
                  aria-labelledby="contact-location-heading"
                  className="border-t pt-8">
                  <div className="mb-4">
                    <h2
                      id="contact-location-heading"
                      className="text-base font-semibold">
                      Contact and location
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Keep the details customers and documents rely on up to
                      date.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Business email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Business phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        rows={3}
                        value={formData.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(event) =>
                          updateField("country", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required htmlFor="timezone">
                        Timezone
                      </FieldLabel>
                      <Input
                        id="timezone"
                        required
                        value={formData.timezone}
                        onChange={(event) =>
                          updateField("timezone", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel required htmlFor="currency">
                        Currency
                      </FieldLabel>
                      <Input
                        id="currency"
                        required
                        value={formData.currency}
                        onChange={(event) =>
                          updateField("currency", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>
                <aside className="flex gap-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Logo and cover image will be used on future marketplace and
                    vendor listings.
                  </p>
                </aside>
                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Changes appear on receipts and reports.
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !isDirty}
                    className="lg:w-sm">
                    {loading ? (
                      <IconLoader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <></>
                    )}
                    {loading ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
