import { HostedDirectoryPage } from "@/components/akilibiz/contacts/hosted-directory-page";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}) {
  return <HostedDirectoryPage view="suppliers" searchParams={await searchParams} />;
}
