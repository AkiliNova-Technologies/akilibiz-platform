"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import {
  canResend,
  needsDecision,
  type ContactChangeRequest,
} from "@/lib/contact-conflicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
type LoadState =
  | { kind: "loading" }
  | { kind: "disabled"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; requests: ContactChangeRequest[] };

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })
    : "—";
const show = (value: string | null) => (value && value.trim() ? value : "(empty)");
type Action = "keep_desktop" | "apply_mine" | "withdraw" | "resend";
const withdrawnText: Record<NonNullable<ContactChangeRequest["withdrawnReason"]>, string> = {
  owner: "You withdrew this change.",
  expired_resent: "It expired and you sent it again.",
  expired_superseded: "It expired and a newer change replaced it.",
  already_current: "It expired; the desktop already had your values.",
};
const resolutionText: Record<NonNullable<ContactChangeRequest["resolution"]>, string> = {
  kept_desktop: "You kept the desktop version.",
  reapplied: "You sent your change again.",
  already_current: "The desktop already had your values.",
};

function FieldTable({ request }: { request: ContactChangeRequest }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Your change</th>
            <th className="px-3 py-2 font-medium">Desktop now</th>
          </tr>
        </thead>
        <tbody>
          {request.fields.map((field) => (
            <tr key={field.field} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{field.label}</td>
              <td className={`px-3 py-2 ${field.differs ? "font-medium" : ""}`}>{show(field.mine)}</td>
              <td className="px-3 py-2">
                {request.contactActive ? show(field.desktop) : "Contact removed"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Desktop synchronization: web contact changes and the conflicts that need
 * the owner's decision. The desktop stays authoritative; resolving a conflict
 * either records "keep desktop" or queues the owner's values again.
 */
export function DesktopSyncRequestsPage() {
  const { t } = useI18n();
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = React.useState<string | null>(null);

  // Sets state only after the request settles (safe to call from an effect).
  const fetchRequests = React.useCallback(async () => {
    try {
      const response = await fetch("/api/sync/contact-conflicts", { cache: "no-store" });
      const body = (await response.json()) as { requests?: ContactChangeRequest[]; error?: string };
      if (response.status === 503) {
        setState({ kind: "disabled", message: body.error ?? "Two-way contact editing is not enabled." });
      } else if (!response.ok || !body.requests) {
        setState({ kind: "error", message: body.error ?? "Contact changes could not be loaded." });
      } else {
        setState({ kind: "ready", requests: body.requests });
      }
    } catch {
      setState({ kind: "error", message: "Contact changes could not be loaded. Check your connection." });
    }
  }, []);

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    await fetchRequests();
  }, [fetchRequests]);

  React.useEffect(() => {
    // Same deferred first load as the other request pages.
    queueMicrotask(() => void fetchRequests());
  }, [fetchRequests]);

  const decide = async (request: ContactChangeRequest, action: Action) => {
    setBusy(request.commandId);
    try {
      const response = await fetch("/api/sync/contact-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ commandId: request.commandId, action }),
      });
      const body = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(body.error ?? "The decision could not be saved.");
      toast.success(
        action === "keep_desktop" ? "Desktop version kept." : body.message ?? "Done.",
      );
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "The decision could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  const requests = state.kind === "ready" ? state.requests : [];
  const decisions = requests.filter(needsDecision);
  const waiting = requests.filter((r) => r.state === "pending");
  const done = requests.filter(
    (r) => r.state === "applied" || r.state === "withdrawn" || (r.state === "conflict" && r.resolution),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Desktop synchronization</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Changes you make to customers and suppliers on the web are applied by your paired desktop.
            If the desktop changed the same contact first, it keeps its version and the change appears
            here for you to decide.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/backup">Desktop pairing</Link>
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={state.kind === "loading"}>
            <RefreshCw className="mr-2 size-4" />
            {t("pos.refresh")}
          </Button>
        </div>
      </div>

      {state.kind === "loading" && <p className="text-sm text-muted-foreground">Loading contact changes…</p>}
      {(state.kind === "disabled" || state.kind === "error") && (
        <Card>
          <CardContent className="py-6 text-sm" role={state.kind === "error" ? "alert" : "status"}>
            {state.message}
          </CardContent>
        </Card>
      )}

      {state.kind === "ready" && (
        <>
          <section className="space-y-3" aria-labelledby="needs-decision">
            <h2 id="needs-decision" className="text-base font-semibold">
              Needs your decision {decisions.length > 0 && <Badge variant="destructive">{decisions.length}</Badge>}
            </h2>
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conflicts. Every web change matches the desktop.</p>
            ) : (
              decisions.map((request) => request.state === "expired" ? (
                <Card key={request.commandId}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {request.contactName}
                      <Badge variant="secondary">{request.entity === "customer" ? t("pos.customer") : t("suppliers.supplier")}</Badge>
                      <Badge variant="outline">Expired</Badge>
                    </CardTitle>
                    <CardDescription>
                      You sent this on {when(request.requestedAt)}, but your desktop did not pick it up within
                      7 days, so it was not applied. Resend it to the desktop, or withdraw it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FieldTable request={request} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void decide(request, "withdraw")}
                      >
                        Withdraw
                      </Button>
                      <Button
                        disabled={busy !== null || !request.contactActive || !canResend(request)}
                        onClick={() => void decide(request, "resend")}
                      >
                        {busy === request.commandId ? t("businessProfile.saving") : "Resend"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card key={request.commandId}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {request.contactName}
                      <Badge variant="secondary">{request.entity === "customer" ? t("pos.customer") : t("suppliers.supplier")}</Badge>
                    </CardTitle>
                    <CardDescription>
                      You changed this on {when(request.requestedAt)}, but the desktop had already changed it,
                      so the desktop kept its version.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FieldTable request={request} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void decide(request, "keep_desktop")}
                      >
                        Keep desktop version
                      </Button>
                      <Button
                        disabled={busy !== null || !request.contactActive}
                        onClick={() => void decide(request, "apply_mine")}
                      >
                        {busy === request.commandId ? t("businessProfile.saving") : "Apply my change"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section className="space-y-3" aria-labelledby="waiting">
            <h2 id="waiting" className="text-base font-semibold">Waiting for the desktop</h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting.</p>
            ) : (
              <ul className="space-y-2">
                {waiting.map((request) => (
                  <li
                    key={request.commandId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{request.contactName}</span> — sent {when(request.requestedAt)}.
                      It is applied when your desktop next syncs (expires {when(request.expiresAt)}).
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void decide(request, "withdraw")}
                    >
                      Withdraw
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="completed">
            <h2 id="completed" className="text-base font-semibold">Recently completed</h2>
            {done.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed changes yet.</p>
            ) : (
              <ul className="space-y-2">
                {done.map((request) => (
                  <li
                    key={request.commandId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{request.contactName}</span> —{" "}
                      {request.state === "applied"
                        ? `applied by the desktop ${when(request.appliedAt)}.`
                        : request.state === "withdrawn"
                          ? withdrawnText[request.withdrawnReason ?? "owner"]
                          : resolutionText[request.resolution!]}
                    </span>
                    {request.state === "withdrawn" && canResend(request) && request.contactActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void decide(request, "resend")}
                      >
                        Resend
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
