import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-password-form";
export default function ResetPasswordPage() {
  return <AuthShell>
    <h1 className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight">Set a new password</h1>
    <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>
    <ResetPasswordForm/>
  </AuthShell>;
}
