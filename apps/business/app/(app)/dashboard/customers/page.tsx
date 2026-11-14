import { HostedDirectoryPage } from "@/components/akilibiz/contacts/hosted-directory-page";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}) {
  return <HostedDirectoryPage view="customers" searchParams={await searchParams} />;
}
