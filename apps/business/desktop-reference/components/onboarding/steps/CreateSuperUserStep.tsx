import { useState } from "react";
import { useReduxOnboarding } from "@/hooks/useReduxOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import {
  IconLoader2,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import type { BusinessProfileFormData, SuperUserFormData } from "../OnboardingFlow";

interface CreateSuperUserStepProps {
  onNext: () => void;
  onBack?: () => void;
  onFinish: () => void;
  isLastStep: boolean;
  isFirstStep?: boolean;
  superUserForm: SuperUserFormData;
  setSuperUserForm: (form: SuperUserFormData) => void;
  businessProfileForm?: BusinessProfileFormData;
  setBusinessProfileForm?: (form: BusinessProfileFormData) => void;
}

export default function CreateSuperUserStep({
  onNext,
  onBack,
  superUserForm,
  setSuperUserForm,
}: CreateSuperUserStepProps) {
  const { createSuperUser } = useReduxOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: keyof SuperUserFormData, value: string) => {
    setSuperUserForm({ ...superUserForm, [field]: value });
  };

  const handleSubmit = async () => {
    setError("");

    if (
      !superUserForm.username ||
      !superUserForm.password ||
      !superUserForm.full_name
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (superUserForm.password !== superUserForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (superUserForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const success = await createSuperUser({
      username: superUserForm.username,
      password: superUserForm.password,
      email: superUserForm.email || undefined,
      full_name: superUserForm.full_name,
    });

    setLoading(false);

    if (success) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Set Up the Owner or Manager Account
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates your primary administrator profile. You will use this
            account to manage staff access, view sales reports, and control your
            store settings.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel required htmlFor="full_name">Full Name</FieldLabel>
            <Input
              id="full_name"
              required
              value={superUserForm.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel required htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              required
              value={superUserForm.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={superUserForm.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="admin@business.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel required htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={superUserForm.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel required htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={superUserForm.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }>
                  {showConfirmPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/40 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="rounded-full h-11 flex items-center gap-1 text-muted-foreground hover:text-foreground dark:bg-[#121212]">
          <IconChevronLeft className="size-5" />
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-full h-11 px-6 font-medium shadow-md flex items-center gap-1.5 group">
          {loading ? (
            <>
              <IconLoader2 className="mr-1 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Continue
              <IconChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
