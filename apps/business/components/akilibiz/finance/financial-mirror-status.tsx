import { AlertCircle, CheckCircle2, CloudOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FinancialMirrorStatus({ loading, error, lastSuccessfulSync, isStale }: { loading: boolean; error: string | null; lastSuccessfulSync: string | null; isStale: boolean }) {
  if (error) return <Alert variant="destructive"><AlertCircle/><AlertTitle>Financial mirror unavailable</AlertTitle><AlertDescription>{error} Desktop records remain authoritative and unchanged.</AlertDescription></Alert>;
  if (loading) return <Alert><CloudOff/><AlertTitle>Loading synchronized records</AlertTitle><AlertDescription>Reading the latest desktop-published financial mirror.</AlertDescription></Alert>;
  if (!lastSuccessfulSync) return <Alert><CloudOff/><AlertTitle>No synchronized financial data</AlertTitle><AlertDescription>Complete a desktop business-mirror synchronization to publish read-only records here.</AlertDescription></Alert>;
  const instant = new Date(lastSuccessfulSync);
  return <Alert variant={isStale ? "destructive" : "default"}><CheckCircle2/><AlertTitle>{isStale ? "Synchronized data may be stale" : "Desktop mirror synchronized"}</AlertTitle><AlertDescription>Last successful mirror publication: {Number.isNaN(instant.getTime()) ? lastSuccessfulSync : instant.toLocaleString("en-UG")}.</AlertDescription></Alert>;
}
