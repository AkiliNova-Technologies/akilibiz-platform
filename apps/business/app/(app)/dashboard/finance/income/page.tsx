"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  Banknote as IconCash,
  CircleDollarSign,
  LoaderCircle,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  type FinancePaymentMethod,
  formatFinanceCurrency,
  formatFinanceDate,
} from "@/components/akilibiz/finance/finance-overview-data";
import {
  type IncomeRow,
  type IncomeStatus,
  useFinanceIncomeData,
} from "@/components/akilibiz/finance/finance-income-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Row = IncomeRow & TableData;
type Form = {
  categoryId: string;
  amount: string;
  method: FinancePaymentMethod;
  source: string;
  date: string;
  status: IncomeStatus;
  description: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const freshForm = (): Form => ({
  categoryId: "",
  amount: "",
  method: "cash",
  source: "",
  date: today(),
  status: "pending",
  description: "",
});
const methodLabel = (method: string) =>
  ({
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    mobile_money: "Mobile Money",
    card: "Card",
  })[method] ?? method;
const statusLabel = (status: string) =>
  ({
    received: "Received",
    pending: "Pending",
    verified: "Verified",
    cancelled: "Cancelled",
  })[status] ?? status;
function MethodBadge({ method }: { method: string }) {
  return (
    <Badge variant="outline" className="gap-1">
      {methodLabel(method)}
    </Badge>
  );
}
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "cancelled"
          ? "destructive"
          : status === "pending"
            ? "secondary"
            : "outline"
      }>
      {statusLabel(status)}
    </Badge>
  );
}

export default function FinanceIncomePage() {
  const {
    incomeEntries,
    incomeSummary,
    incomeCategories,
    loading,
    error,
    refreshIncome,
    addIncomeEntry,
  } = useFinanceIncomeData();
  const [selected, setSelected] = useState<Row | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Form>(freshForm);
  useEffect(() => {
    void refreshIncome();
  }, [refreshIncome]);
  const rows = useMemo<Row[]>(
    () => incomeEntries.map((entry) => ({ ...entry })),
    [incomeEntries],
  );
  const setField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const openDetails = (row: Row) => {
    setSelected(row);
    setViewOpen(true);
  };
  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.categoryId) nextErrors.categoryId = "Category is required";
    if (
      !form.amount ||
      Number(form.amount) <= 0 ||
      !Number.isFinite(Number(form.amount))
    )
      nextErrors.amount = "Valid amount is required";
    if (!form.date) nextErrors.date = "Date is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    const entry = await addIncomeEntry({
      category_id: Number(form.categoryId),
      amount: Number(form.amount),
      payment_method: form.method,
      source_name: form.source.trim() || null,
      transaction_date: form.date,
      status: form.status,
      description: form.description.trim() || null,
    });
    setSubmitting(false);
    if (!entry) {
      toast.error("Failed to record income");
      return;
    }
    toast.success("Income recorded successfully");
    setFormOpen(false);
    setForm(freshForm());
  };
  const fields: TableField<Row>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      align: "center",
      enableSorting: true,
    },
    {
      key: "source",
      header: "Source",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{String(value || "-")}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">
          {formatFinanceCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      align: "center",
      cell: (value) => <MethodBadge method={String(value)} />,
    },
    {
      key: "date",
      header: "Date",
      align: "center",
      enableSorting: true,
      cell: (value) => formatFinanceDate(String(value)),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => <StatusBadge status={String(value)} />,
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: "View income", onClick: openDetails },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Income Management</h2>
            <p className="text-sm text-muted-foreground">
              Track incoming revenue, customer payments, and other business
              income sources.
            </p>
          </div>
          {error ? (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <AlertCircle className="size-4" />
                <span>{error}</span>
              </CardContent>
            </Card>
          ) : null}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Income"
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.total_income) : "—"}
              description="All recorded income excluding cancelled entries"
              icon={<ArrowUp className="size-5" />}
            />
            <MetricCard
              title="Received Income"
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.received_income) : "—"}
              description="Income already confirmed or verified"
              icon={<IconCash className="size-5" />}
            />
            <MetricCard
              title="Pending Income"
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.pending_income) : "—"}
              description="Income awaiting confirmation"
              icon={<WalletCards className="size-5" />}
            />
            <MetricCard
              title="Income Categories"
              value={incomeSummary ? String(incomeSummary.income_categories) : "—"}
              description="Tracked income sources"
              icon={<CircleDollarSign className="size-5" />}
            />
          </section>
          <Card>
            <CardContent>
              <DataTable<Row>
                title="Income Register"
                description="Track income entries, collection methods, and confirmation status"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search income..."
                pageSize={10}
                loading={loading}
                onRowClick={openDetails}
                emptyMessage="Income records are unavailable until the hosted finance service is connected."
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void refreshIncome()}
                      disabled size="icon" aria-label="Refresh" title="Refresh">
                      {loading ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      
                    </Button>
                    <Button
                      disabled title="Income posting is not connected"
                      onClick={() => {
                        setForm(freshForm());
                        setErrors({});
                        setFormOpen(true);
                      }}>
                      <Plus className="mr-2 size-4" />
                      Record Income
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Income Details</DialogTitle>
            <DialogDescription>
              Review income information and collection status.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                {[
                  ["Reference", selected.reference],
                  ["Category", selected.category],
                  ["Source", selected.source || "-"],
                  ["Amount", formatFinanceCurrency(selected.amount)],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <MethodBadge method={selected.method} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {formatFinanceDate(selected.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                {selected.description ? (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Description
                      </p>
                      <p className="text-sm">{selected.description}</p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Income</DialogTitle>
            <DialogDescription>
              Capture a new income entry for business finance tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Category</FieldLabel>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setField("categoryId", value)}>
                  <SelectTrigger
                    className={`w-full ${errors.categoryId ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId ? (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <FieldLabel required>Amount</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) => setField("amount", event.target.value)}
                  placeholder="Enter amount"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount ? (
                  <p className="text-sm text-red-500">{errors.amount}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(event) => setField("source", event.target.value)}
                  placeholder="Enter income source"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Income Date</FieldLabel>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setField("date", event.target.value)}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date ? (
                  <p className="text-sm text-red-500">{errors.date}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Collection Method</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) =>
                    setField("method", value as FinancePaymentMethod)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as IncomeStatus)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                placeholder="Enter income description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled title="Income posting is not connected">
              {submitting ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
