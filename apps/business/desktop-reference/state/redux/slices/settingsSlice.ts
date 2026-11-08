import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriSettingsService,
  type BusinessProfile,
  type ReceiptSettings,
  type TaxConfig,
  type UpdateBusinessProfilePayload,
  type UpdateReceiptSettingsPayload,
  type UpdateTaxConfigPayload,
  type BackupRecord,
  type CreateBackupPayload,
  type BackupVerification,
} from "@/services/tauri/settings";

interface SettingsState {
  businessProfile: BusinessProfile | null;
  receiptSettings: ReceiptSettings | null;
  taxConfig: TaxConfig | null;
  loading: boolean;
  error: string | null;
  backupRecords: BackupRecord[];
}

const initialState: SettingsState = {
  businessProfile: null,
  receiptSettings: null,
  taxConfig: null,
  loading: false,
  error: null,
  backupRecords: [],
};

export const fetchBusinessProfile = createAsyncThunk<
  BusinessProfile,
  void,
  { rejectValue: string }
>("settings/fetchBusinessProfile", async (_, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.getBusinessProfile();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load business profile"));
  }
});

export const updateBusinessProfile = createAsyncThunk<
  BusinessProfile,
  UpdateBusinessProfilePayload,
  { rejectValue: string }
>("settings/updateBusinessProfile", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.updateBusinessProfile(payload);
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to update business profile"),
    );
  }
});

export const fetchReceiptSettings = createAsyncThunk<
  ReceiptSettings,
  void,
  { rejectValue: string }
>("settings/fetchReceiptSettings", async (_, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.getReceiptSettings();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load receipt settings"));
  }
});

export const updateReceiptSettings = createAsyncThunk<
  ReceiptSettings,
  UpdateReceiptSettingsPayload,
  { rejectValue: string }
>("settings/updateReceiptSettings", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.updateReceiptSettings(payload);
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to update receipt settings"),
    );
  }
});

export const fetchTaxConfig = createAsyncThunk<
  TaxConfig,
  void,
  { rejectValue: string }
>("settings/fetchTaxConfig", async (_, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.getTaxConfig();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to load tax configuration"),
    );
  }
});

export const updateTaxConfig = createAsyncThunk<
  TaxConfig,
  UpdateTaxConfigPayload,
  { rejectValue: string }
>("settings/updateTaxConfig", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.updateTaxConfig(payload);
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to update tax configuration"),
    );
  }
});

export const fetchBackupRecords = createAsyncThunk<
  BackupRecord[],
  void,
  { rejectValue: string }
>("settings/fetchBackupRecords", async (_, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.getBackupRecords();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load backup records"));
  }
});

export const createBackup = createAsyncThunk<
  BackupRecord,
  CreateBackupPayload,
  { rejectValue: string }
>("settings/createBackup", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.createBackup(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create backup"));
  }
});

export const verifyBackup = createAsyncThunk<
  BackupVerification,
  string,
  { rejectValue: string }
>("settings/verifyBackup", async (sourcePath, { rejectWithValue }) => {
  try {
    return await tauriSettingsService.verifyBackup(sourcePath);
  } catch (error: unknown) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to verify backup",
    );
  }
});

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBusinessProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.businessProfile = action.payload;
      })
      .addCase(fetchBusinessProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load business profile";
      })

      .addCase(updateBusinessProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBusinessProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.businessProfile = action.payload;
      })
      .addCase(updateBusinessProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update business profile";
      })

      .addCase(fetchReceiptSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceiptSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.receiptSettings = action.payload;
      })
      .addCase(fetchReceiptSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load receipt settings";
      })

      .addCase(updateReceiptSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReceiptSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.receiptSettings = action.payload;
      })
      .addCase(updateReceiptSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update receipt settings";
      })

      .addCase(fetchTaxConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaxConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.taxConfig = action.payload;
      })
      .addCase(fetchTaxConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load tax configuration";
      })

      .addCase(updateTaxConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaxConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.taxConfig = action.payload;
      })
      .addCase(updateTaxConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update tax configuration";
      })
      .addCase(fetchBackupRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBackupRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.backupRecords = action.payload;
      })
      .addCase(fetchBackupRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load backup records";
      })

      .addCase(createBackup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBackup.fulfilled, (state, action) => {
        state.loading = false;
        state.backupRecords.unshift(action.payload);
      })
      .addCase(createBackup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create backup";
      })
      .addCase(verifyBackup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyBackup.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyBackup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to verify backup";
      });
  },
});

export const { clearSettingsError } = settingsSlice.actions;

export const selectBusinessProfile = (state: { settings: SettingsState }) =>
  state.settings.businessProfile;
export const selectReceiptSettings = (state: { settings: SettingsState }) =>
  state.settings.receiptSettings;
export const selectTaxConfig = (state: { settings: SettingsState }) =>
  state.settings.taxConfig;
export const selectSettingsLoading = (state: { settings: SettingsState }) =>
  state.settings.loading;
export const selectSettingsError = (state: { settings: SettingsState }) =>
  state.settings.error;
export const selectBackupRecords = (state: { settings: SettingsState }) =>
  state.settings.backupRecords;

export default settingsSlice.reducer;
