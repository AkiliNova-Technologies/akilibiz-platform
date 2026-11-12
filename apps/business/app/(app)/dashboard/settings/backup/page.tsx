import { requireActiveBusiness } from "@/lib/business-context";
import { BackupRestorePage } from "@/components/akilibiz/settings/backup-restore-page";

export default async function BackupSettingsPage() {
  const business = await requireActiveBusiness();
  return <BackupRestorePage canPair={business.role === "owner"} businessName={business.name} />;
}
