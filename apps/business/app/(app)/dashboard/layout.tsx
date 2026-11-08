import { requireActiveBusiness } from "@/lib/business-context";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireActiveBusiness();
  return children;
}
