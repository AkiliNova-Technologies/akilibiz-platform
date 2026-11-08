"use client";

import { useActionState } from "react";
import { grantStaffAccess, type StaffActionState } from "./staff-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBanner } from "@/components/akilibiz/status-banner";

const initial: StaffActionState = { error: null, message: null };

export function GrantAccessForm() {
  const [state, action, pending] = useActionState(grantStaffAccess, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="staff-email">Staff account email</Label>
          <Input id="staff-email" name="email" type="email" required
            placeholder="staff@example.com" autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-role">Business role</Label>
          <Select name="role" required>
            <SelectTrigger id="staff-role" className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="inventory_staff">Inventory staff</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This person must already have an AkiliBiz login. Granting access does not
        share passwords or send an invitation email.
      </p>
      {state.error && <StatusBanner title="Unable to save access" tone="error">{state.error}</StatusBanner>}
      {state.message && <StatusBanner title="Changes saved" tone="success">{state.message}</StatusBanner>}
      <Button type="submit" disabled={pending}>{pending ? "Saving access…" : "Grant or update access"}</Button>
    </form>
  );
}
