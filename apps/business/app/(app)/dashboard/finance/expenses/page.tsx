"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  Banknote as IconCash,
  CircleDollarSign,
  LoaderCircle,
  Plus,
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
  type CreateExpensePayload,
  type ExpenseRow,
  type ExpenseStatus,
  useFinanceExpensesData,
} from "@/components/akilibiz/finance/finance-expenses-data";
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";
import { useSuppliersData } from "@/components/akilibiz/suppliers/suppliers-data";
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

type Row = ExpenseRow & TableData;
type Form = {
  categoryId: string;
  amount: string;
  method: FinancePaymentMethod;
  vendor: string;
  date: string;
  status: ExpenseStatus;
  description: string;
  paymentBasis: "paid" | "supplier_credit";
  supplierId: string;
  taxAmount: string;
  taxable: boolean;
  documentDate: string;
  invoiceReference: string;
  invoiceIssuer: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const fresh = (): Form => ({
  categoryId: "",
  amount: "",
  method: "cash",
  vendor: "",
  date: today(),
  status: "pending",
  description: "",
  paymentBasis: "paid",
  supplierId: "",
  taxAmount: "0",
  taxable: false,
  documentDate: today(),
  invoiceReference: "",
  invoiceIssuer: "",
});
const paymentStatus = (row: Row) =>
  row.state === "voided"
    ? "Reversed"
    : row.payment_basis === "supplier_credit" && row.payable_outstanding_ugx
      ? "Unpaid / partially paid"
      : row.status === "paid"
        ? "Paid"
        : row.status[0].toUpperCase() + row.status.slice(1);
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "Reversed"
          ? "destructive"
          : status === "Pending" || status.includes("Unpaid")
            ? "secondary"
            : "outline"
      }
      className={
        status === "Paid" ? "bg-emerald-600 hover:bg-emerald-600" : ""
      }>
      {status}
    </Badge>
  );
}

export default function FinanceExpensesPage() {
  const {
    expenses,
    expenseSummary,
    expenseCategories,
    loading,
    error, lastSuccessfulSync, isStale,
    refreshExpenses,
    addExpense,
    settleExpense,
    reverseExpense,
  } = useFinanceExpensesData();
  const { suppliers } = useSuppliersData();
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stateFilter, setStateFilter] = useState("all");
  const [form, setForm] = useState<Form>(fresh);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementReference, setSettlementReference] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  useEffect(() => {
    void refreshExpenses();
  }, [refreshExpenses]);
  const rows = useMemo<Row[]>(
    () =>
      expenses
        .filter(
          (expense) => stateFilter === "all" || expense.state === stateFilter,
        )
        .map((expense) => ({ ...expense })),
    [expenses, stateFilter],
  );
  const setField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const submit = async () => {
    const next: Record<string, string> = {};
    const amount = Number(form.amount);
    const tax = Number(form.taxAmount);
    if (!form.categoryId) next.categoryId = "Category is required";
    if (
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !Number.isInteger(tax) ||
      tax < 0
    )
      next.amount = "Amounts must be whole UGX";
    if (!form.date) next.date = "Date is required";
    if (form.paymentBasis === "supplier_credit" && !form.supplierId)
      next.supplierId = "Supplier is required for unpaid expenses";
    if (
      form.taxable &&
      (!form.invoiceReference.trim() ||
        !form.invoiceIssuer.trim() ||
        !form.documentDate)
    )
      next.taxable =
        "Taxable expenses require invoice reference, issuer and document date";
    setErrors(next);
    if (Object.keys(next).length) return;
    const supplier = suppliers.find(
      (item) => item.id === Number(form.supplierId),
    );
    const payload: CreateExpensePayload & { payee: string } = {
      category_id: Number(form.categoryId),
      payment_basis: form.paymentBasis,
      supplier_id: supplier?.id,
      payee:
        form.paymentBasis === "supplier_credit"
          ? (supplier?.name ?? "")
          : form.vendor.trim(),
      payee_name: form.vendor.trim() || undefined,
      payment_method: form.method,
      effective_date: form.date,
      net_ugx: amount,
      tax_ugx: tax,
      gross_ugx: amount + tax,
      input_vat_eligible: form.taxable,
      source_document_date: form.taxable ? form.documentDate : undefined,
      invoice_reference: form.taxable
        ? form.invoiceReference.trim()
        : undefined,
      invoice_issuer: form.taxable ? form.invoiceIssuer.trim() : undefined,
      status: form.status,
      description: form.description.trim() || undefined,
    };
    setSubmitting(true);
    const result = await addExpense(payload);
    setSubmitting(false);
    if (!result) {
      toast.error("Failed to record expense");
      return;
    }
    toast.success("Expense recorded successfully");
    setFormOpen(false);
    setForm(fresh());
  };
  const settle = async () => {
    if (
      !detail ||
      !Number.isInteger(Number(settlementAmount)) ||
      Number(settlementAmount) <= 0 ||
      !settlementReference.trim()
    ) {
      toast.error("Enter a whole-UGX amount and payment reference.");
      return;
    }
    const result = await settleExpense(
      detail.id,
      Number(settlementAmount),
      settlementReference.trim(),
    );
    if (!result) {
      toast.error("Payment cannot exceed the remaining balance.");
      return;
    }
    toast.success("Supplier expense payment recorded");
    setDetail((current) =>
      current
        ? {
            ...current,
            payable_outstanding_ugx: Math.max(
              0,
              (current.payable_outstanding_ugx ?? 0) - Number(settlementAmount),
            ),
          }
        : null,
    );
    setSettlementAmount("");
    setSettlementReference("");
  };
  const reverse = async () => {
    if (!detail || !reverseReason.trim()) {
      toast.error("A reversal reason is required.");
      return;
    }
    await reverseExpense(detail.id, reverseReason.trim());
    setDetail((current) => (current ? { ...current, state: "voided" } : null));
    toast.success("Expense reversed successfully");
  };
  const fields: TableField<Row>[] = [
    { key: "reference", header: "Reference" },
    {
      key: "effective_date",
      header: "Date",
      enableSorting: true,
      cell: (value) => formatFinanceDate(String(value)),
    },
    { key: "payee", header: "Supplier / Payee", enableSorting: true },
    { key: "due_date", header: "Due date", enableSorting: true,
      cell: (value) => value ? formatFinanceDate(String(value)) : "—" },
    { key: "category", header: "Category", enableSorting: true },
    {
      key: "gross_ugx",
      header: "Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium text-red-600">
          {formatFinanceCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Payment status",
      cell: (_value, row) => <StatusBadge status={paymentStatus(row)} />,
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View expense",
      onClick: (row) => {
        setDetail(row);
        setSettlementAmount("");
        setSettlementReference("");
        setReverseReason("");
      },
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
        <div>
            <h2 className="text-2xl font-semibold">Expenses</h2>
            <p className="text-sm text-muted-foreground">
              Record, review and manage business expenses.
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
              title="Total Expenses"
              value={expenseSummary ? formatFinanceCurrency(expenseSummary.total_expenses) : "—"}
              description="All approved and paid expenses"
              icon={<ArrowDown className="size-5" />}
            />
            <MetricCard
              title="Paid Expenses"
              value={expenseSummary ? formatFinanceCurrency(expenseSummary.paid_expenses) : "—"}
              description="Expenses already settled"
              icon={<IconCash className="size-5" />}
            />
            <MetricCard
              title="Pending Expenses"
              value={expenseSummary ? formatFinanceCurrency(expenseSummary.pending_expenses) : "—"}
              description="Awaiting approval or settlement"
              icon={<WalletCards className="size-5" />}
            />
            <MetricCard
              title="Expense Categories"
              value={expenseSummary ? String(expenseSummary.expense_categories) : "—"}
              description="Tracked spending areas"
              icon={<CircleDollarSign className="size-5" />}
            />
          </section>
          <Card>
            <CardContent>
              <DataTable<Row>
                title="Expenses"
                description="Review recorded expenses and their payment status."
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search expenses..."
                pageSize={10}
                loading={loading}
                emptyMessage={
                  loading ? "Loading expenses…" : "Expense records are unavailable until the hosted finance service is connected."
                }
                toolbarFilters={
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger
                      aria-label="Expense status"
                      className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All expenses</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="voided">Reversed</SelectItem>
                      <SelectItem value="corrected">Corrected</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                }
                onRefresh={() => {
                  void refreshExpenses();
                }}
                refreshing={loading}
                toolbarActions={
                  <Button
                    disabled
                    title="Expense posting is not connected"
                    onClick={() => {
                      setForm(fresh());
                      setErrors({});
                      setFormOpen(true);
                    }}>
                    <Plus className="mr-2 size-4" />
                    Record expense
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
        <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Capture a new expense entry for business finance tracking.
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
                    {expenseCategories.map((category) => (
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
                  step="1"
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
            <div className="space-y-2">
              <FieldLabel required>When was it paid?</FieldLabel>
              <Select
                value={form.paymentBasis}
                onValueChange={(value) =>
                  setField("paymentBasis", value as Form["paymentBasis"])
                }>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid now</SelectItem>
                  <SelectItem value="supplier_credit">
                    Pay supplier later
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.paymentBasis === "supplier_credit" ? (
              <div className="space-y-2">
                <FieldLabel required>Supplier</FieldLabel>
                <Select
                  value={form.supplierId}
                  onValueChange={(value) => setField("supplierId", value)}>
                  <SelectTrigger
                    className={`w-full ${errors.supplierId ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplierId ? (
                  <p className="text-sm text-red-500">{errors.supplierId}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Recoverable input VAT</Label>
                  <p className="text-xs text-muted-foreground">
                    Only enable for a valid taxable supplier invoice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={form.taxable ? "default" : "outline"}
                  onClick={() => setField("taxable", !form.taxable)}>
                  {form.taxable ? "Taxable" : "Non-taxable"}
                </Button>
              </div>
              {form.taxable ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>VAT (UGX)</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.taxAmount}
                      onChange={(event) =>
                        setField("taxAmount", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required>Document date</FieldLabel>
                    <Input
                      type="date"
                      value={form.documentDate}
                      onChange={(event) =>
                        setField("documentDate", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required>Invoice reference</FieldLabel>
                    <Input
                      value={form.invoiceReference}
                      onChange={(event) =>
                        setField("invoiceReference", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required>Invoice issuer</FieldLabel>
                    <Input
                      value={form.invoiceIssuer}
                      onChange={(event) =>
                        setField("invoiceIssuer", event.target.value)
                      }
                    />
                  </div>
                </div>
              ) : null}
              {errors.taxable ? (
                <p className="text-sm text-red-500">{errors.taxable}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vendor / Payee</Label>
                <Input
                  value={form.vendor}
                  onChange={(event) => setField("vendor", event.target.value)}
                  placeholder="Enter vendor or payee"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Expense Date</FieldLabel>
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
                <Label>Payment Method</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) =>
                    setField("method", value as FinancePaymentMethod)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "cash",
                        "bank_transfer",
                        "mobile_money",
                        "card",
                        "cheque",
                        "other",
                      ] as FinancePaymentMethod[]
                    ).map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as ExpenseStatus)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                placeholder="Enter expense description"
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
            <Button onClick={() => void submit()} disabled>
              {submitting ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense details</DialogTitle>
            <DialogDescription>
              Review the expense, its payment status, and any remaining balance.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded border p-3">
                <span>Status</span>
                <StatusBadge status={paymentStatus(detail)} />
                <span>Date</span>
                <span>{formatFinanceDate(detail.effective_date)}</span>
                <span>Supplier / Payee</span>
                <span>{detail.payee || "-"}</span>
                <span>Category</span>
                <span>{detail.category}</span>
                <span>Amount before tax / tax / total</span>
                <span>
                  {formatFinanceCurrency(detail.net_ugx)} /{" "}
                  {formatFinanceCurrency(detail.tax_ugx)} /{" "}
                  {formatFinanceCurrency(detail.gross_ugx)}
                </span>
                <span>Remaining balance</span>
                <span>
                  {detail.payable_outstanding_ugx == null
                    ? "Not applicable"
                    : formatFinanceCurrency(detail.payable_outstanding_ugx)}
                </span>
              </div>
              {detail.payment_basis === "supplier_credit" &&
              detail.state === "posted" ? (
                <div className="space-y-2 rounded border p-3">
                  <Label>Record supplier payment</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="UGX amount"
                      value={settlementAmount}
                      onChange={(event) =>
                        setSettlementAmount(event.target.value)
                      }
                    />
                    <Input
                      placeholder="Payment reference"
                      value={settlementReference}
                      onChange={(event) =>
                        setSettlementReference(event.target.value)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The remaining balance is checked before payment is recorded.
                    Payments above that balance are not allowed.
                  </p>
                  <Button type="button" onClick={() => void settle()} disabled>
                    Record payment
                  </Button>
                </div>
              ) : null}
              {detail.state === "posted" ? (
                <div className="space-y-2 rounded border p-3">
                  <Label>Reverse expense</Label>
                  <p className="text-xs text-muted-foreground">
                    This records a reversal and cannot be undone.
                  </p>
                  <Textarea
                    value={reverseReason}
                    onChange={(event) => setReverseReason(event.target.value)}
                    placeholder="Reason for reversal"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void reverse()} disabled>
                    Reverse expense
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
