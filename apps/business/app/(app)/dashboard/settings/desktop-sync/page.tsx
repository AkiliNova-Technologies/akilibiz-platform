import { redirect } from "next/navigation";

export default function DesktopSyncPage() {
  redirect("/dashboard/settings/backup");
}
