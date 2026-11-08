import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReduxAuth } from "@/hooks/useReduxAuth";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { signIn, loading: authLoading } = useReduxAuth();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error(t("auth.usernameRequired"));
      return;
    }

    if (!password.trim()) {
      toast.error(t("auth.passwordRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(username.trim(), password.trim());
      toast.success(t("auth.loginSuccessful"));
      // Navigate after successful login
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.signInDescription")}
          </p>
        </div>

        <Field>
          <FieldLabel required htmlFor="username">{t("auth.username")}</FieldLabel>
          <Input
            id="username"
            type="text"
            placeholder={t("auth.enterUsername")}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
        </Field>

        <Field>
          <FieldLabel required htmlFor="password">{t("auth.password")}</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.enterPassword")}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="pr-10 min-h-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        <Field>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signingIn")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
