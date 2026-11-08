import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriRolesPermissionsService,
  type Permission,
  type RoleDetailResponse,
  type RoleQuery,
  type RoleResponse,
  type RoleSummary,
  type UpdateRolePermissionsPayload,
  type CreateRolePayload,
} from "@/services/tauri/roles-permissions";

interface RolesPermissionsState {
  roles: RoleResponse[];
  selectedRole: RoleDetailResponse | null;
  permissions: Permission[];
  summary: RoleSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: RolesPermissionsState = {
  roles: [],
  selectedRole: null,
  permissions: [],
  summary: null,
  loading: false,
  error: null,
};

export const fetchRoles = createAsyncThunk<
  RoleResponse[],
  RoleQuery | undefined,
  { rejectValue: string }
>("rolesPermissions/fetchRoles", async (params, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.getRoles(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch roles"));
  }
});

export const fetchRoleById = createAsyncThunk<
  RoleDetailResponse,
  number,
  { rejectValue: string }
>("rolesPermissions/fetchRoleById", async (roleId, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.getRole(roleId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch role"));
  }
});

export const fetchPermissions = createAsyncThunk<
  Permission[],
  void,
  { rejectValue: string }
>("rolesPermissions/fetchPermissions", async (_, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.getPermissions();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch permissions"));
  }
});

export const createRole = createAsyncThunk<
  RoleDetailResponse,
  CreateRolePayload,
  { rejectValue: string }
>("rolesPermissions/createRole", async (payload, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.createRole(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create role"));
  }
});

export const saveRolePermissions = createAsyncThunk<
  RoleDetailResponse,
  { roleId: number; payload: UpdateRolePermissionsPayload },
  { rejectValue: string }
>(
  "rolesPermissions/saveRolePermissions",
  async ({ roleId, payload }, { rejectWithValue }) => {
    try {
      return await tauriRolesPermissionsService.updateRolePermissions(
        roleId,
        payload,
      );
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update role permissions"),
      );
    }
  },
);

export const fetchRoleSummary = createAsyncThunk<
  RoleSummary,
  void,
  { rejectValue: string }
>("rolesPermissions/fetchRoleSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.getRoleSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch role summary"));
  }
});

export const deleteRoleThunk = createAsyncThunk<
  void,
  number,
  { rejectValue: string }
>("rolesPermissions/deleteRole", async (roleId, { rejectWithValue }) => {
  try {
    return await tauriRolesPermissionsService.deleteRole(roleId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to delete role"));
  }
});

const rolesPermissionsSlice = createSlice({
  name: "rolesPermissions",
  initialState,
  reducers: {
    clearSelectedRole: (state) => {
      state.selectedRole = null;
    },
    clearRolesPermissionsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch roles";
      })

      .addCase(fetchRoleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRole = action.payload;
      })
      .addCase(fetchRoleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch role";
      })

      .addCase(fetchPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.permissions = action.payload;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch permissions";
      })

      .addCase(createRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRole = action.payload;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create role";
      })

      .addCase(deleteRoleThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRoleThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteRoleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete role";
      })

      .addCase(saveRolePermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveRolePermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRole = action.payload;
        state.roles = state.roles.map((role) =>
          role.id === action.payload.id
            ? {
                ...role,
                role_name: action.payload.role_name,
                description: action.payload.description,
                users_count: action.payload.users_count,
                access_scope: action.payload.access_scope,
                permissions_count: action.payload.permissions_count,
                status: action.payload.status,
                permissions: action.payload.permissions.map((p) => p.code),
                created_at: action.payload.created_at,
                updated_at: action.payload.updated_at,
              }
            : role,
        );
      })
      .addCase(saveRolePermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update role permissions";
      })

      .addCase(fetchRoleSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoleSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchRoleSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch role summary";
      });
  },
});

export const { clearSelectedRole, clearRolesPermissionsError } =
  rolesPermissionsSlice.actions;

export const selectRoles = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.roles;
export const selectSelectedRole = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.selectedRole;
export const selectPermissions = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.permissions;
export const selectRoleSummary = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.summary;
export const selectRolesPermissionsLoading = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.loading;
export const selectRolesPermissionsError = (state: {
  rolesPermissions: RolesPermissionsState;
}) => state.rolesPermissions.error;

export default rolesPermissionsSlice.reducer;
