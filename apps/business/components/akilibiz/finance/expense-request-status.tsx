"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
type RequestStatus = {
  command_id: string;
  operation: "create" | "settle" | "void";
  state: "pending" | "applied" | "rejected";
  reason: string | null;
  result: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  requested_at: string;
};
export function ExpenseRequestStatus() {
  const [requests, setRequests] = React.useState<RequestStatus[]>([]),
    [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    void fetch("/api/finance/expenses/requests", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as {
          requests?: RequestStatus[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(body.error ?? "Unable to load expense requests.");
        if (active) setRequests(body.requests ?? []);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load expense requests.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <h3 className="font-semibold">Submitted requests</h3>
        {requests.length ? (
          requests.map((request) => (
            <div
              key={request.command_id}
              className="rounded-md border p-3 text-sm"
            >
              <p className="font-medium">
                {request.operation === "create"
                  ? "New expense"
                  : request.operation === "settle"
                    ? "Expense payment"
                    : "Expense reversal"}
              </p>
              <p className="text-muted-foreground">
                {request.state === "pending"
                  ? "Awaiting desktop approval"
                  : request.state === "rejected"
                    ? `Rejected${request.reason ? `: ${request.reason}` : ""}`
                    : request.operation === "settle"
                      ? "Payment recorded"
                      : "Recorded on desktop"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No expense requests submitted.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
