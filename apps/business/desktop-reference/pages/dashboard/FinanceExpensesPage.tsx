import * as React from "react";
import {
  DataTable,
  type TableField,
  type TableData,
  type TableAction,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconAlertCircle,
  IconArrowDown,
  IconCash,
  IconLoader2,
  IconPlus,
  IconReportMoney,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxFinance } from "@/hooks/useReduxFinance";
import { getErrorMessage } from "@/utils/error-message";
import type {
  ExpenseStatus,
  FinancePaymentMethod,
  AuthoritativeExpenseRow,
} from "@/services/tauri/finance";
import { tauriFinanceService } from "@/services/tauri/finance";
import {
  tauriSuppliersService,
  type SupplierResponse,
} from "@/services/tauri/suppliers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type ExpenseStatusLabel = "Paid" | "Pending" | "Approved" | "Rejected";

interface CurrentExpenseRow extends TableData {
  id: number;
  reference: string;
  category: string;
  payee: string;
  amount: number;
  date: string;
  status: string;
}

interface ExpenseFormData {
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
}

// ============================================================================
// UTILS
// ============================================================================

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function statusToLabel(status: string): ExpenseStatusLabel | string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function getStatusBadge(status: string) {
  const label = statusToLabel(status);
  switch (label) {
    case "Paid":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>
      );
    case "Pending":
      return (
        <Badge className="border-border dark:bg-[#121212]/50 text-primary">
          Pending
        </Badge>
      );
    case "Approved":
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700">
          Approved
        </Badge>
      );
    case "Rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

function paymentStatusLabel(row: AuthoritativeExpenseRow) {
  if (row.state === "voided") return "Voided";
  if (row.state === "corrected") return "Corrected";
  if (row.state === "refunded") return "Refunded";
  if (row.payable_state === "settled") return "Paid";
  if (row.payable_state === "open") return "Unpaid / partially paid";
  return "Paid";
}

function mapCurrentExpenseRows(
  rows: AuthoritativeExpenseRow[],
): CurrentExpenseRow[] {
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    category: row.category,
    payee: row.payee_or_supplier || "-",
    amount: row.gross_ugx,
    date: row.effective_date,
    status: paymentStatusLabel(row),
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceExpensesPage() {
  const {
    expenseEntries,
    expenseSummary,
    expenseCategories,
    loading,
    error,
    refreshExpenses,
    clearError,
  } = useReduxFinance();

  const [formOpen, setFormOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [authoritative, setAuthoritative] = React.useState<
    AuthoritativeExpenseRow[]
  >([]);
  const [authoritativeLoading, setAuthoritativeLoading] = React.useState(true);
  const [authoritativeError, setAuthoritativeError] = React.useState<
    string | null
  >(null);
  const [authoritativeState, setAuthoritativeState] = React.useState("all");
  const [suppliers, setSuppliers] = React.useState<SupplierResponse[]>([]);
  const [authoritativeDetail, setAuthoritativeDetail] = React.useState<Awaited<
    ReturnType<typeof tauriFinanceService.getAuthoritativeExpense>
  > | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [settlementAmount, setSettlementAmount] = React.useState("");
  const [settlementReference, setSettlementReference] = React.useState("");
  const [voidReason, setVoidReason] = React.useState("");
  const loadAuthoritative = React.useCallback(async () => {
    setAuthoritativeLoading(true);
    setAuthoritativeError(null);
    try {
      setAuthoritative(
        await tauriFinanceService.getAuthoritativeExpenses({
          state: authoritativeState === "all" ? undefined : authoritativeState,
          limit: 20,
        }),
      );
    } catch (err) {
      setAuthoritativeError(getErrorMessage(err, "Unable to load expenses"));
    } finally {
      setAuthoritativeLoading(false);
    }
  }, [authoritativeState]);

  const [formData, setFormData] = React.useState<ExpenseFormData>({
    categoryId: "",
    amount: "",
    method: "cash",
    vendor: "",
    date: getTodayString(),
    status: "pending",
    description: "",
    paymentBasis: "paid",
    supplierId: "",
    taxAmount: "0",
    taxable: false,
    documentDate: getTodayString(),
    invoiceReference: "",
    invoiceIssuer: "",
  });

  React.useEffect(() => {
    refreshExpenses().catch(console.error);
  }, [refreshExpenses]);
  React.useEffect(() => {
    loadAuthoritative();
  }, [loadAuthoritative]);
  React.useEffect(() => {
    tauriSuppliersService
      .getSuppliers({ limit: 100, is_active: true })
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const currentExpenses = React.useMemo(
    () => mapCurrentExpenseRows(authoritative),
    [authoritative],
  );

  const refreshAllExpenses = React.useCallback(async () => {
    await Promise.all([refreshExpenses(), loadAuthoritative()]);
  }, [loadAuthoritative, refreshExpenses]);

  const totalExpenses = expenseSummary?.total_expenses ?? 0;
  const paidExpenses = expenseSummary?.paid_expenses ?? 0;
  const pendingExpenses = expenseSummary?.pending_expenses ?? 0;
  const expenseCategoriesCount = expenseSummary?.expense_categories ?? 0;

  const resetForm = () => {
    setFormData({
      categoryId: "",
      amount: "",
      method: "cash",
      vendor: "",
      date: getTodayString(),
      status: "pending",
      description: "",
      paymentBasis: "paid",
      supplierId: "",
      taxAmount: "0",
      taxable: false,
      documentDate: getTodayString(),
      invoiceReference: "",
      invoiceIssuer: "",
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    }
    if (
      !Number.isInteger(Number(formData.amount)) ||
      !Number.isInteger(Number(formData.taxAmount)) ||
      Number(formData.taxAmount) < 0
    )
      newErrors.amount = "Amounts must be whole UGX";
    if (formData.paymentBasis === "supplier_credit" && !formData.supplierId)
      newErrors.supplierId = "Supplier is required for unpaid expenses";
    if (
      formData.taxable &&
      (!formData.invoiceReference.trim() ||
        !formData.invoiceIssuer.trim() ||
        !formData.documentDate)
    )
      newErrors.taxable =
        "Taxable expenses require invoice reference, issuer and document date";
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (
    field: keyof ExpenseFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await tauriFinanceService.createAuthoritativeExpense({
        category_id: Number(formData.categoryId),
        payment_basis: formData.paymentBasis,
        supplier_id:
          formData.paymentBasis === "supplier_credit"
            ? Number(formData.supplierId)
            : null,
        payee_name: formData.vendor.trim() || null,
        payment_method: formData.method,
        effective_date: formData.date,
        net_ugx: Number(formData.amount),
        tax_ugx: Number(formData.taxAmount),
        gross_ugx: Number(formData.amount) + Number(formData.taxAmount),
        input_vat_eligible: formData.taxable,
        non_deductible: false,
        source_document_date: formData.taxable ? formData.documentDate : null,
        invoice_reference: formData.taxable
          ? formData.invoiceReference.trim()
          : null,
        invoice_issuer: formData.taxable ? formData.invoiceIssuer.trim() : null,
        description: formData.description.trim() || null,
        idempotency_key: crypto.randomUUID(),
      });

      if (result) {
        toast.success("Expense recorded successfully");
        await refreshAllExpenses();
        setFormOpen(false);
        resetForm();
      } else {
        toast.error("Failed to record expense");
      }
    } catch (error) {
      console.error("Expense error:", error);
      toast.error(getErrorMessage(error, "Failed to record expense"));
    } finally {
      setSubmitting(false);
    }
  };

  const openAuthoritativeDetail = async (expenseId: number) => {
    try {
      setAuthoritativeDetail(
        await tauriFinanceService.getAuthoritativeExpense(expenseId),
      );
      setSettlementAmount("");
      setSettlementReference("");
      setVoidReason("");
      setDetailOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load expense details"));
    }
  };
  const refreshDetail = async () => {
    if (!authoritativeDetail) return;
    const detail = await tauriFinanceService.getAuthoritativeExpense(
      authoritativeDetail.expense.id,
    );
    setAuthoritativeDetail(detail);
    await loadAuthoritative();
  };
  const settlePayable = async () => {
    if (
      !authoritativeDetail?.payable_id ||
      !Number.isInteger(Number(settlementAmount)) ||
      Number(settlementAmount) <= 0 ||
      !settlementReference.trim()
    ) {
      toast.error("Enter a whole-UGX amount and payment reference.");
      return;
    }
    try {
      await tauriFinanceService.settleExpensePayable({
        payable_id: authoritativeDetail.payable_id,
        amount_ugx: Number(settlementAmount),
        effective_date: getTodayString(),
        payment_method: "cash",
        reference: settlementReference.trim(),
        idempotency_key: crypto.randomUUID(),
      });
      toast.success("Supplier expense payment recorded");
      await refreshDetail();
    } catch (error) {
      toast.error(getErrorMessage(error, "Payment could not be recorded"));
    }
  };
  const voidExpense = async () => {
    if (!authoritativeDetail || !voidReason.trim()) {
      toast.error("A void reason is required.");
      return;
    }
    try {
      await tauriFinanceService.voidAuthoritativeExpense(
        authoritativeDetail.expense.id,
        {
          effective_date: getTodayString(),
          reason: voidReason.trim(),
          idempotency_key: crypto.randomUUID(),
        },
      );
      toast.success("Expense reversed successfully");
      await refreshDetail();
    } catch (error) {
      toast.error(getErrorMessage(error, "Expense could not be voided"));
    }
  };

  const currentExpenseFields: TableField<CurrentExpenseRow>[] = [
    { key: "reference", header: "Reference" },
    {
      key: "date",
      header: "Date",
      enableSorting: true,
      cell: (value) =>
        new Date(String(value)).toLocaleDateString("en-UG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    { key: "payee", header: "Supplier / Payee", enableSorting: true },
    { key: "category", header: "Category", enableSorting: true },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium text-red-600">
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Payment status",
      cell: (value) => getStatusBadge(String(value)),
    },
  ];

  const currentExpenseActions: TableAction<CurrentExpenseRow>[] = [
    {
      type: "view",
      label: "View expense",
      onClick: (row) => void openAuthoritativeDetail(row.id),
    },
  ];

  return (
    <>
      <SiteHeader label="Expenses" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Expenses</h2>
            <p className="text-sm text-muted-foreground">
              Record, review and manage business expenses.
            </p>
          </div>

          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <IconAlertCircle className="size-4" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses)}
              description="All approved and paid expenses"
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title="Paid Expenses"
              value={formatCurrency(paidExpenses)}
              description="Expenses already settled"
              icon={<IconCash className="size-5" />}
            />

            <MetricCard
              title="Pending Expenses"
              value={formatCurrency(pendingExpenses)}
              description="Awaiting approval or settlement"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title="Expense Categories"
              value={String(expenseCategoriesCount)}
              description="Tracked spending areas"
              icon={<IconReportMoney className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              {authoritativeError && (
                <p className="mb-3 text-sm text-destructive">
                  {authoritativeError}
                </p>
              )}
              {expenseEntries.length > 0 && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {expenseEntries.length} earlier expense record
                  {expenseEntries.length === 1 ? " is" : "s are"} available.
                </p>
              )}
              <DataTable<CurrentExpenseRow>
                title="Expenses"
                description="Review recorded expenses and their payment status."
                data={currentExpenses}
                fields={currentExpenseFields}
                actions={currentExpenseActions}
                enableGlobalSearch
                searchPlaceholder="Search expenses..."
                pageSize={10}
                loading={authoritativeLoading}
                emptyMessage={
                  authoritativeLoading
                    ? "Loading expenses…"
                    : "No expenses recorded yet."
                }
                toolbarFilters={
                  <Select
                    value={authoritativeState}
                    onValueChange={setAuthoritativeState}>
                    <SelectTrigger
                      aria-label="Expense status"
                      className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All expenses</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                      <SelectItem value="corrected">Corrected</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                }
                onRefresh={() => refreshAllExpenses().catch(console.error)}
                refreshing={authoritativeLoading || loading}
                toolbarActions={
                  <Button onClick={handleAdd}>
                    <IconPlus className="size-4" />
                    Record expense
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Dialog */}
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
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    handleFieldChange("categoryId", value)
                  }>
                  <SelectTrigger
                    aria-required="true"
                    className={cn("w-full", errors.categoryId && "border-red-500")}>
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
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel required htmlFor="amount">
                  Amount
                </FieldLabel>
                <Input
                  id="amount"
                  required
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleFieldChange("amount", e.target.value)}
                  placeholder="Enter amount"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel required>When was it paid?</FieldLabel>
              <Select
                value={formData.paymentBasis}
                onValueChange={(value: "paid" | "supplier_credit") =>
                  handleFieldChange("paymentBasis", value)
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
            {formData.paymentBasis === "supplier_credit" && (
              <div className="space-y-2">
                <FieldLabel required>Supplier</FieldLabel>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    handleFieldChange("supplierId", value)
                  }>
                  <SelectTrigger
                    className={cn("w-full", errors.supplierId && "border-red-500")}>
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
                {errors.supplierId && (
                  <p className="text-sm text-red-500">{errors.supplierId}</p>
                )}
              </div>
            )}
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>Recoverable input VAT</Label>
                  <p className="text-xs text-muted-foreground">
                    Only enable for a valid taxable supplier invoice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.taxable ? "default" : "outline"}
                  onClick={() =>
                    handleFieldChange("taxable", !formData.taxable)
                  }>
                  {formData.taxable ? "Taxable" : "Non-taxable"}
                </Button>
              </div>
              {formData.taxable && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required htmlFor="tax-amount">
                      VAT (UGX)
                    </FieldLabel>
                    <Input
                      id="tax-amount"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.taxAmount}
                      onChange={(e) =>
                        handleFieldChange("taxAmount", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required htmlFor="document-date">
                      Document date
                    </FieldLabel>
                    <Input
                      id="document-date"
                      type="date"
                      value={formData.documentDate}
                      onChange={(e) =>
                        handleFieldChange("documentDate", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required>Invoice reference</FieldLabel>
                    <Input
                      value={formData.invoiceReference}
                      onChange={(e) =>
                        handleFieldChange("invoiceReference", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel required>Invoice issuer</FieldLabel>
                    <Input
                      value={formData.invoiceIssuer}
                      onChange={(e) =>
                        handleFieldChange("invoiceIssuer", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
              {errors.taxable && (
                <p className="text-sm text-red-500">{errors.taxable}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <Label htmlFor="vendor">Vendor / Payee</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => handleFieldChange("vendor", e.target.value)}
                  placeholder="Enter vendor or payee"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel required htmlFor="date">
                  Expense Date
                </FieldLabel>
                <Input
                  id="date"
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFieldChange("date", e.target.value)}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value: FinancePaymentMethod) =>
                    handleFieldChange("method", value)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ExpenseStatus) =>
                    handleFieldChange("status", value)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
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
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense details</DialogTitle>
            <DialogDescription>
              Review the expense, its payment status, and any remaining balance.
            </DialogDescription>
          </DialogHeader>
          {authoritativeDetail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded border p-3">
                <span>Status</span>
                <Badge variant="outline">
                  {paymentStatusLabel(authoritativeDetail.expense)}
                </Badge>
                <span>Date</span>
                <span>
                  {new Date(
                    authoritativeDetail.expense.effective_date,
                  ).toLocaleDateString("en-UG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span>Supplier / Payee</span>
                <span>
                  {authoritativeDetail.expense.payee_or_supplier || "-"}
                </span>
                <span>Category</span>
                <span>{authoritativeDetail.expense.category}</span>
                <span>Amount before tax / tax / total</span>
                <span>
                  {formatCurrency(authoritativeDetail.expense.net_ugx)} /{" "}
                  {formatCurrency(authoritativeDetail.expense.tax_ugx)} /{" "}
                  {formatCurrency(authoritativeDetail.expense.gross_ugx)}
                </span>
                <span>Remaining balance</span>
                <span>
                  {authoritativeDetail.payable_outstanding_ugx == null
                    ? "Not applicable"
                    : formatCurrency(
                        authoritativeDetail.payable_outstanding_ugx,
                      )}
                </span>
              </div>
              {authoritativeDetail.payable_id &&
                authoritativeDetail.expense.state === "posted" && (
                  <div className="space-y-2 rounded border p-3">
                    <Label>Record supplier payment</Label>
                    <div className="flex gap-2">
                      <Input
                        aria-label="Settlement amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="UGX amount"
                        value={settlementAmount}
                        onChange={(e) => setSettlementAmount(e.target.value)}
                      />
                      <Input
                        aria-label="Settlement reference"
                        placeholder="Payment reference"
                        value={settlementReference}
                        onChange={(e) => setSettlementReference(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The remaining balance is checked before payment is
                      recorded. Payments above that balance are not allowed.
                    </p>
                    <Button type="button" onClick={settlePayable}>
                      Record payment
                    </Button>
                  </div>
                )}
              {authoritativeDetail.expense.state === "posted" && (
                <div className="space-y-2 rounded border p-3">
                  <Label>Reverse expense</Label>
                  <p className="text-xs text-muted-foreground">
                    This records a reversal and cannot be undone.
                  </p>
                  <Textarea
                    aria-label="Void reason"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Reason for reversal"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={voidExpense}>
                    Reverse expense
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
