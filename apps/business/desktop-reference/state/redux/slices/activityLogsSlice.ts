import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriActivityLogsService,
  type ActivityLogQuery,
  type ActivityLogResponse,
  type ActivityLogSummary,
} from "@/services/tauri/activity-logs";

interface ActivityLogsState {
  items: ActivityLogResponse[];
  selectedLog: ActivityLogResponse | null;
  summary: ActivityLogSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: ActivityLogsState = {
  items: [],
  selectedLog: null,
  summary: null,
  loading: false,
  error: null,
};

export const fetchActivityLogs = createAsyncThunk<
  ActivityLogResponse[],
  ActivityLogQuery | undefined,
  { rejectValue: string }
>("activityLogs/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriActivityLogsService.getActivityLogs(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch activity logs"));
  }
});

export const fetchActivityLogById = createAsyncThunk<
  ActivityLogResponse,
  number,
  { rejectValue: string }
>("activityLogs/fetchById", async (logId, { rejectWithValue }) => {
  try {
    return await tauriActivityLogsService.getActivityLog(logId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch activity log"));
  }
});

export const fetchActivityLogSummary = createAsyncThunk<
  ActivityLogSummary,
  void,
  { rejectValue: string }
>("activityLogs/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriActivityLogsService.getActivityLogSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch activity log summary"));
  }
});

const activityLogsSlice = createSlice({
  name: "activityLogs",
  initialState,
  reducers: {
    clearSelectedActivityLog: (state) => {
      state.selectedLog = null;
    },
    clearActivityLogsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivityLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch activity logs";
      })

      .addCase(fetchActivityLogById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedLog = action.payload;
      })
      .addCase(fetchActivityLogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch activity log";
      })

      .addCase(fetchActivityLogSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchActivityLogSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch activity log summary";
      });
  },
});

export const {
  clearSelectedActivityLog,
  clearActivityLogsError,
} = activityLogsSlice.actions;

export const selectActivityLogs = (state: { activityLogs: ActivityLogsState }) =>
  state.activityLogs.items;
export const selectSelectedActivityLog = (state: { activityLogs: ActivityLogsState }) =>
  state.activityLogs.selectedLog;
export const selectActivityLogSummary = (state: { activityLogs: ActivityLogsState }) =>
  state.activityLogs.summary;
export const selectActivityLogsLoading = (state: { activityLogs: ActivityLogsState }) =>
  state.activityLogs.loading;
export const selectActivityLogsError = (state: { activityLogs: ActivityLogsState }) =>
  state.activityLogs.error;

export default activityLogsSlice.reducer;
