import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Display actionable load failures, not transfer metadata on business pages. */
export function FinancialMirrorStatus({ loading, error }: {
  loading: boolean;
  error: string | null;
  lastSuccessfulSync: string | null;
  isStale: boolean;
}) {
  if (error) return <Alert variant="destructive">
    <AlertCircle/><AlertTitle>Could not load financial records</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">
    Loading financial records…
  </p>;
  return null;
}
