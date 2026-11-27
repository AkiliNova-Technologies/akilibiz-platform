"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { AkiliButton } from "@/components/akilibiz/akili-button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { signOut as signOutServer } from "@/app/(app)/dashboard/auth-actions";
import { clearAccountOperationStorage } from "@/lib/account-storage";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";

export function SignOutButton({
  menuItem = false,
  className,
}: {
  menuItem?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const result = await signOutServer();
    if (!result.ok) {
      // Also attempt the browser client so a transient server failure cannot
      // leave an already-expired local session appearing active.
      await createClient().auth.signOut({ scope: "local" });
    }
    try {
      clearAccountOperationStorage(window.sessionStorage);
    } catch {
      // Storage may be disabled. Server cookies remain the security boundary.
    }
    router.replace("/sign-in");
    router.refresh();
  }

  if (menuItem) {
    return (
      // Desktop nav-user: red "Log out" with its icon.
      <DropdownMenuItem
        className={className ?? "text-red-600 focus:text-red-600"}
        disabled={isSigningOut}
        onSelect={(event) => {
          event.preventDefault();
          void signOut();
        }}
      >
        <LogOut aria-hidden="true" className="mr-2 size-4" />
        {t("common.logOut")}
      </DropdownMenuItem>
    );
  }

  return (
    <AkiliButton
      className="hidden sm:inline-flex"
      loading={isSigningOut}
      onClick={signOut}
      type="button"
      variant="secondary"
    >
      {t("common.logOut")}
    </AkiliButton>
  );
}
