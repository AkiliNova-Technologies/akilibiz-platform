"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { AkiliButton } from "@/components/akilibiz/akili-button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { signOut as signOutServer } from "@/app/(app)/dashboard/auth-actions";
import { clearAccountOperationStorage } from "@/lib/account-storage";

export function SignOutButton({
  menuItem = false,
  className,
}: {
  menuItem?: boolean;
  className?: string;
}) {
  const router = useRouter();
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
      <DropdownMenuItem
        className={className}
        disabled={isSigningOut}
        onSelect={(event) => {
          event.preventDefault();
          void signOut();
        }}
      >
        <LogOut aria-hidden="true" className="size-4" />
        {isSigningOut ? "Signing out…" : "Sign out"}
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
      Sign out
    </AkiliButton>
  );
}
