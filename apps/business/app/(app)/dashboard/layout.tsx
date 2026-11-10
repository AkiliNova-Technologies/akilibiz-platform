import { requireActiveBusiness } from "@/lib/business-context";
import { ActiveBusinessProvider } from "@/components/active-business-context";

export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await requireActiveBusiness();
  return (
    <ActiveBusinessProvider businessId={business.id}>
      {children}
    </ActiveBusinessProvider>
  );
}
