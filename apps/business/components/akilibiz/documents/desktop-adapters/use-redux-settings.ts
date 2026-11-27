"use client";

// Web stand-in for the desktop's useReduxSettings, limited to what the shared
// receipt dialog uses. The profile and settings arrive with each receipt
// (see documents.ts), so the explicit loaders only return what is held.
import { useCallback, useSyncExternalStore } from "react";
import { receiptSettingsStore } from "./documents";

export function useReduxSettings() {
  const { businessProfile, receiptSettings } = useSyncExternalStore(
    receiptSettingsStore.subscribe, receiptSettingsStore.get, receiptSettingsStore.get);
  const getBusinessProfile = useCallback(async () => receiptSettingsStore.get().businessProfile, []);
  const getReceiptSettings = useCallback(async () => receiptSettingsStore.get().receiptSettings, []);
  return { businessProfile, receiptSettings, getBusinessProfile, getReceiptSettings };
}
