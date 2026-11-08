import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/hooks/useI18n";

export function ModuleGuard({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { can, loadingAuth } = usePermissions();
  const { t } = useI18n();

  if (loadingAuth) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
