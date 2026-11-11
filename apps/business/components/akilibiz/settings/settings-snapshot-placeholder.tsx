import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Kind = "tax" | "receipt";
type State = "loading" | "unavailable" | "error";

function Value({ state, height = "h-10" }: { state: State; height?: string }) {
  return state === "loading"
    ? <Skeleton className={`${height} w-full rounded-full bg-muted`} />
    : <div aria-hidden="true" className={`${height} w-full rounded-full border bg-muted/10`} />;
}
function Field({ label, state }: { label: string; state: State }) {
  return <div className="min-w-0 space-y-2">
    <p className="text-sm font-medium">{label}</p>
    <Value state={state} />
  </div>;
}
function Toggle({ label, state }: { label: string; state: State }) {
  return <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border p-3">
    <span className="text-sm font-medium">{label}</span>
    {state === "loading"
      ? <Skeleton className="h-5 w-10 shrink-0 rounded-full bg-muted" />
      : <span className="h-5 w-10 shrink-0 rounded-full border bg-muted/10" aria-hidden="true" />}
  </div>;
}

/** Stable page geometry without showing unsynchronized default business values. */
export function SettingsSnapshotPlaceholder({ kind, state }: { kind: Kind; state: State }) {
  if (kind === "tax") return (
    <div aria-busy={state === "loading"} className="flex min-w-0 flex-col gap-4 md:gap-6">
      <Card><CardContent className="min-w-0 space-y-6 px-3 sm:px-4 md:px-6">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">VAT Registration</h3>
          <Toggle label="Registered for VAT" state={state} />
          <div className="max-w-lg"><Field label="VAT registration number" state={state} /></div>
        </section>
        <div className="border-t" />
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Tax Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default tax name" state={state} />
            <Field label="Business TIN" state={state} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm font-medium">Current standard VAT rate</span>
            <span className="text-sm text-muted-foreground">—</span>
          </div>
        </section>
        <div className="border-t" />
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Receipt Options</h3>
          <Toggle label="Show tax on receipts" state={state} />
        </section>
        <div className="border-t" />
        <div className="flex gap-2">
          <span className="rounded-full border px-4 py-2 text-sm text-muted-foreground">Reset changes</span>
          <span className="rounded-full border px-4 py-2 text-sm text-muted-foreground">Save changes</span>
        </div>
      </CardContent></Card>
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div><h3 className="font-semibold">Tax Management</h3>
          <p className="text-sm text-muted-foreground">Review tax records under Finance.</p>
        </div>
        <span className="rounded-full border px-4 py-2 text-sm text-muted-foreground">Open Tax Management</span>
      </CardContent></Card>
    </div>
  );
  const metrics = ["Receipt Width", "Copies Per Print", "Enabled Options", "Header"];
  return <div aria-busy={state === "loading"} className="space-y-6">
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((label) => <Card key={label}><CardContent className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        {state === "loading" ? <Skeleton className="h-7 w-2/3 rounded-full bg-muted" /> : <p className="text-xl">—</p>}
      </CardContent></Card>)}
    </section>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
      <Card><CardContent className="space-y-5 px-4 sm:px-6">
        <div><h2 className="text-lg font-semibold">Receipt Configuration</h2>
          <p className="text-sm text-muted-foreground">Receipt content and printing preferences.</p></div>
        <Field label="Business Header" state={state} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Print Format" state={state} />
          <Field label="Copies Per Print" state={state} />
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Footer Message</p><Value height="h-24" state={state} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Show Logo","Show TIN","Show Cashier Name","Show Customer Name","Show Payment Method","Show Thank You Note","Auto Print After Sale"].map((label) =>
            <Toggle key={label} label={label} state={state} />)}
        </div>
        <div className="border-t pt-4 text-sm text-muted-foreground">Reset changes　 Save Changes</div>
      </CardContent></Card>
      <Card><CardContent className="space-y-3 px-4 sm:px-6">
        <h2 className="text-lg font-semibold">Live receipt preview</h2>
        <p className="text-sm text-muted-foreground">Preview available after synchronization.</p>
        <div className="flex min-h-[34rem] justify-center bg-muted/20 p-5">
          <div className="w-full max-w-[302px] space-y-4 rounded-sm border bg-card p-5">
            {Array.from({ length: 10 }, (_, index) => state === "loading"
              ? <Skeleton key={index} className={`h-3 rounded-full bg-muted ${index % 3 === 0 ? "w-2/3" : "w-full"}`} />
              : <div key={index} className="h-3 rounded-full bg-muted/15" />)}
          </div>
        </div>
      </CardContent></Card>
    </div>
  </div>;
}
