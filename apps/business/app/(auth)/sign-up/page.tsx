import { AuthShell } from "../auth-shell";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return <AuthShell>
    <h1 className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight">Create your account</h1>
    <p className="mt-2 text-sm text-muted-foreground">Start using AkiliBiz in a few simple steps.</p>
    <SignUpForm/>
  </AuthShell>;
}
