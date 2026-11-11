import { AuthShell } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return <AuthShell>
    <h1 className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight">Forgot password?</h1>
    <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a password reset link.</p>
    <ForgotPasswordForm/>
  </AuthShell>;
}
