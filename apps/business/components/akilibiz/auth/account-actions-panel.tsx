"use client";

import { useState } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountNameForm } from "@/components/akilibiz/auth/account-name-form";
import { AccountPasswordForm } from "@/components/akilibiz/auth/account-password-form";

export function AccountActionsPanel({ name }: { name: string }) {
  const [active, setActive] = useState<"profile" | "password" | null>(null);
  return <>
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-full"
        onClick={() => setActive("profile")}><Pencil className="mr-2 size-4" />Edit profile</Button>
      <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-full"
        onClick={() => setActive("password")}><KeyRound className="mr-2 size-4" />Change online password</Button>
    </div>
    <Dialog open={active === "profile"} onOpenChange={open => !open && setActive(null)}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Update your AkiliBiz account name.</DialogDescription></DialogHeader>
        <AccountNameForm name={name} />
      </DialogContent>
    </Dialog>
    <Dialog open={active === "password"} onOpenChange={open => !open && setActive(null)}>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>Change online password</DialogTitle>
          <DialogDescription>For AkiliBiz Web and desktop cloud sign-in. Your offline desktop password is separate.</DialogDescription>
        </DialogHeader>
        <AccountPasswordForm />
      </DialogContent>
    </Dialog>
  </>;
}
