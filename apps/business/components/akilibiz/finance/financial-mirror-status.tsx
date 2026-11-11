import { AlertCircle, CloudOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Show actionable issues only. Transfer timestamps belong to Desktop sync settings. */
export function FinancialMirrorStatus({ loading, error, lastSuccessfulSync, isStale }: {
  loading: boolean;
  error: string | null;
  lastSuccessfulSync: string | null;
  isStale: boolean;
}) {
  if (error) return <Alert variant="destructive">
    <AlertCircle/><AlertTitle>Financial records unavailable</AlertTitle>
    <AlertDescription>{error} Desktop records remain unchanged.</AlertDescription>
  </Alert>;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">
    Loading financial records…
  </p>;
  if (!lastSuccessfulSync) return <Alert>
    <CloudOff/><AlertTitle>No financial records received</AlertTitle>
    <AlertDescription>
      The business has no confirmed financial snapshot available here.
      Check Settings → Backup & Restore → Desktop sync for transfer status.
    </AlertDescription>
  </Alert>;
  if (isStale) return <Alert>
    <AlertCircle/><AlertTitle>Financial records may be outdated</AlertTitle>
    <AlertDescription>
      Check the last successful transfer under Settings → Backup & Restore → Desktop sync.
    </AlertDescription>
  </Alert>;
  return null;
}
