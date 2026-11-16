import { AppShell } from "@/components/akilibiz/app-shell";
import { getActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getInitials(email: string) {
  const name = email.split("@")[0] || "A";
  const words = name.split(/[._-]+/).filter(Boolean);

  return words.length > 1
    ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/sign-in?next=/dashboard");
  }

  const activeBusiness = await getActiveBusiness();
  const email = user.email;
  const displayName = email.split("@")[0] || "AkiliBiz user";

  return (
    <AppShell
      businessRole={activeBusiness?.role ?? null}
      account={{
        displayName,
        email,
        initials: getInitials(email),
      }}
    >
      {children}
    </AppShell>
  );
}
