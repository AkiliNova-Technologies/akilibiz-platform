"use client";

import { useCallback, useMemo, useState } from "react";

export interface BusinessProfileFormData {
  address: string;
  business_name: string;
  city: string;
  country: string;
  currency: string;
  email: string;
  owner_name: string;
  phone: string;
  registration_number: string;
  timezone: string;
  tin: string;
  trading_name: string;
}

export type ProfileMediaKind = "logo" | "cover";

export interface BrowserBusinessProfile extends BusinessProfileFormData {
  cover_media_url: string | null;
  logo_media_url: string | null;
}

export const emptyBusinessProfile: BrowserBusinessProfile = {
  address: "",
  business_name: "",
  city: "",
  country: "",
  cover_media_url: null,
  currency: "UGX",
  email: "",
  logo_media_url: null,
  owner_name: "",
  phone: "",
  registration_number: "",
  timezone: "Africa/Kampala",
  tin: "",
  trading_name: "",
};

export function useBrowserBusinessProfile() {
  const [profile, setProfile] =
    useState<BrowserBusinessProfile>(emptyBusinessProfile);
  const [savedProfile, setSavedProfile] =
    useState<BrowserBusinessProfile>(emptyBusinessProfile);
  const [loading, setLoading] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(savedProfile),
    [profile, savedProfile],
  );

  const updateField = useCallback(
    (field: keyof BusinessProfileFormData, value: string) => {
      setProfile((current) => ({ ...current, [field]: value }));
    },
    [],
  );
  const save = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.resolve();
      setSavedProfile(profile);
    } finally {
      setLoading(false);
    }
  }, [profile]);
  const reset = useCallback(() => setProfile(savedProfile), [savedProfile]);
  const setMedia = useCallback((kind: ProfileMediaKind, url: string) => {
    setProfile((current) => ({ ...current, [`${kind}_media_url`]: url }));
  }, []);
  const removeMedia = useCallback((kind: ProfileMediaKind) => {
    setProfile((current) => ({ ...current, [`${kind}_media_url`]: null }));
  }, []);

  return {
    isDirty,
    loading,
    profile,
    removeMedia,
    reset,
    save,
    setMedia,
    updateField,
  };
}
