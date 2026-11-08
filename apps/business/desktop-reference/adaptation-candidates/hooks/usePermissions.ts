import { useAppSelector } from "@/redux/hooks";
import {
  selectUser,
  selectAuthLoading,
} from "@/redux/slices/authSlice";

export const usePermissions = () => {
  const user = useAppSelector(selectUser);
  const loadingAuth = useAppSelector(selectAuthLoading);

  const permissions = user?.permissions ?? [];

  const can = (permission: string) => permissions.includes(permission);

  const canAny = (required: string[]) =>
    required.some((permission) => permissions.includes(permission));

  return {
    user,
    permissions,
    loadingAuth,
    can,
    canAny,
    isAdmin: user?.role_name === "Admin",
  };
};