import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriStaffService,
  type StaffMember,
  type CreateStaffPayload,
  type UpdateStaffPayload,
  type StaffRole,
} from "@/services/tauri/staff";

interface StaffState {
  items: StaffMember[];
  selectedStaff: StaffMember | null;
  roles: StaffRole[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffState = {
  items: [],
  selectedStaff: null,
  roles: [],
  loading: false,
  error: null,
};

export const fetchStaff = createAsyncThunk<
  StaffMember[],
  void,
  { rejectValue: string }
>("staff/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await tauriStaffService.getStaff();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch staff"));
  }
});

export const fetchStaffById = createAsyncThunk<
  StaffMember,
  number,
  { rejectValue: string }
>("staff/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await tauriStaffService.getStaffMember(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch staff member"));
  }
});

export const createStaff = createAsyncThunk<
  StaffMember,
  CreateStaffPayload,
  { rejectValue: string }
>("staff/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriStaffService.createStaff(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create staff member"));
  }
});

export const updateStaff = createAsyncThunk<
  StaffMember,
  { id: number; payload: UpdateStaffPayload },
  { rejectValue: string }
>("staff/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriStaffService.updateStaff(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update staff member"));
  }
});

export const fetchStaffRoles = createAsyncThunk<
  StaffRole[],
  void,
  { rejectValue: string }
>("staff/fetchRoles", async (_, { rejectWithValue }) => {
  try {
    return await tauriStaffService.getStaffRoles();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch staff roles"));
  }
});

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    clearSelectedStaff: (state) => {
      state.selectedStaff = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch staff";
      })

      .addCase(fetchStaffById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedStaff = action.payload;
      })
      .addCase(fetchStaffById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch staff member";
      })

      .addCase(createStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create staff member";
      })

      .addCase(updateStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedStaff?.id === action.payload.id) {
          state.selectedStaff = action.payload;
        }
      })
      .addCase(updateStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update staff member";
      })

      .addCase(fetchStaffRoles.fulfilled, (state, action) => {
        state.roles = action.payload;
      })
      .addCase(fetchStaffRoles.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch staff roles";
      });
  },
});

export const { clearSelectedStaff, clearError } = staffSlice.actions;

export const selectStaff = (state: { staff: StaffState }) => state.staff.items;
export const selectSelectedStaff = (state: { staff: StaffState }) =>
  state.staff.selectedStaff;
export const selectStaffRoles = (state: { staff: StaffState }) =>
  state.staff.roles;
export const selectStaffLoading = (state: { staff: StaffState }) =>
  state.staff.loading;
export const selectStaffError = (state: { staff: StaffState }) =>
  state.staff.error;

export type Staff = StaffMember;

export default staffSlice.reducer;
