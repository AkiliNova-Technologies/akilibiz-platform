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
  IconArrowUp,
  IconCash,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconReportMoney,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { Separator } from "@/components/ui/separator";
import { useReduxFinance } from "@/hooks/useReduxFinance";
import { getErrorMessage } from "@/utils/error-message";
import type {
  FinancePaymentMethod,
  IncomeRow,
  IncomeStatus,
} from "@/services/tauri/finance";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

type IncomeMethodLabel = "Cash" | "Bank Transfer" | "Mobile Money" | "Card";
type IncomeStatusLabel = "Received" | "Pending" | "Verified" | "Cancelled";

interface TableIncomeRow extends TableData {
  id: number;
  reference: string;
  category: string;
  amount: number;
  method: string;
  source: string;
  date: string;
  status: string;
  description: string;
}

interface IncomeFormData {
  categoryId: string;
  amount: string;
  method: FinancePaymentMethod;
  source: string;
  date: string;
  status: IncomeStatus;
  description: string;
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

function paymentMethodToLabel(method: string): IncomeMethodLabel | string {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_transfer":
      return "Bank Transfer";
    case "mobile_money":
      return "Mobile Money";
    case "card":
      return "Card";
    default:
      return method;
  }
}

function statusToLabel(status: string): IncomeStatusLabel | string {
  switch (status) {
    case "received":
      return "Received";
    case "pending":
      return "Pending";
    case "verified":
      return "Verified";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getMethodBadge(method: string) {
  const label = paymentMethodToLabel(method);
  return (
    <Badge variant="outline" className="gap-1">
      {label}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  const label = statusToLabel(status);
  switch (label) {
    case "Received":
      return <Badge variant="outline">Received</Badge>;
    case "Pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "Verified":
      return <Badge variant="outline">Verified</Badge>;
    case "Cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

function mapIncomeRows(rows: IncomeRow[]): TableIncomeRow[] {
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    category: row.category,
    amount: row.amount,
    method: row.method ?? "",
    source: row.source ?? "",
    date: row.date,
    status: row.status ?? "",
    description: row.description ?? "",
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceIncomePage() {
  const {
    incomeEntries,
    incomeSummary,
    incomeCategories,
    loading,
    error,
    refreshIncome,
    addIncomeEntry,
    clearError,
  } = useReduxFinance();

  const [selectedIncome, setSelectedIncome] = React.useState<TableIncomeRow | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<IncomeFormData>({
    categoryId: "",
    amount: "",
    method: "cash",
    source: "",
    date: getTodayString(), // Auto-fill today's date
    status: "pending",
    description: "",
  });

  React.useEffect(() => {
    refreshIncome().catch(console.error);
  }, [refreshIncome]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const income = React.useMemo(
    () => mapIncomeRows(incomeEntries),
    [incomeEntries],
  );

  const totalIncome = incomeSummary?.total_income ?? 0;
  const receivedIncome = incomeSummary?.received_income ?? 0;
  const pendingIncome = incomeSummary?.pending_income ?? 0;
  const incomeCategoriesCount = incomeSummary?.income_categories ?? 0;

  const resetForm = () => {
    setFormData({
      categoryId: "",
      amount: "",
      method: "cash",
      source: "",
      date: getTodayString(), // Auto-fill today's date
      status: "pending",
      description: "",
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
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof IncomeFormData, value: string) => {
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
      const result = await addIncomeEntry({
        category_id: Number(formData.categoryId),
        amount: Number(formData.amount),
        payment_method: formData.method,
        source_name: formData.source.trim() || null,
        transaction_date: formData.date,
        status: formData.status,
        description: formData.description.trim() || null,
      });

      if (result) {
        toast.success("Income recorded successfully");
        await refreshIncome().catch(console.error);
        setFormOpen(false);
        resetForm();
      } else {
        toast.error("Failed to record income");
      }
    } catch (error) {
      console.error("Income error:", error);
      toast.error(getErrorMessage(error, "Failed to record income"));
    } finally {
      setSubmitting(false);
    }
  };

  const fields: TableField<TableIncomeRow>[] = [
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
      cell: (value) => <span className="font-medium">{String(value || "-")}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      align: "center",
      cell: (value) => getMethodBadge(String(value)),
    },
    {
      key: "date",
      header: "Date",
      align: "center",
      enableSorting: true,
      cell: (value) =>
        new Date(String(value)).toLocaleDateString("en-UG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(String(value)),
    },
  ];

  const actions: TableAction<TableIncomeRow>[] = [
    {
      type: "view",
      label: "View income",
      onClick: (row) => {
        setSelectedIncome(row);
        setViewOpen(true);
      },
    },
  ];

  return (
    <>
      <SiteHeader label="Income" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Income Management</h2>
            <p className="text-sm text-muted-foreground">
              Track incoming revenue, customer payments, and other business
              income sources.
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
              title="Total Income"
              value={formatCurrency(totalIncome)}
              description="All recorded income excluding cancelled entries"
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title="Received Income"
              value={formatCurrency(receivedIncome)}
              description="Income already confirmed or verified"
              icon={<IconCash className="size-5" />}
            />

            <MetricCard
              title="Pending Income"
              value={formatCurrency(pendingIncome)}
              description="Income awaiting confirmation"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title="Income Categories"
              value={String(incomeCategoriesCount)}
              description="Tracked income sources"
              icon={<IconReportMoney className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<TableIncomeRow>
                title="Income Register"
                description="Track income entries, collection methods, and confirmation status"
                data={income}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search income..."
                pageSize={10}
                loading={loading}
                onRowClick={(row) => {
                  setSelectedIncome(row);
                  setViewOpen(true);
                }}
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => refreshIncome().catch(console.error)}
                      disabled={loading}
                    >
                      {loading ? (
                        <IconLoader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      <IconRefresh className="size-4" />
                      Refresh
                    </Button>

                    <Button onClick={handleAdd}>
                      <IconPlus className="size-4" />
                      Record Income
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Income Details</DialogTitle>
            <DialogDescription>
              Review income information and collection status.
            </DialogDescription>
          </DialogHeader>

          {selectedIncome && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Reference
                    </span>
                    <span className="font-mono">{selectedIncome.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Category
                    </span>
                    <span className="font-medium">{selectedIncome.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Source
                    </span>
                    <span className="font-medium">
                      {selectedIncome.source || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Amount
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedIncome.amount)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Method
                    </span>
                    {getMethodBadge(selectedIncome.method)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {new Date(selectedIncome.date).toLocaleDateString("en-UG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(selectedIncome.status)}
                  </div>

                  {selectedIncome.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">
                          Description
                        </p>
                        <p className="text-sm">{selectedIncome.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
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
                  value={formData.categoryId}
                  onValueChange={(value) => handleFieldChange("categoryId", value)}
                >
                  <SelectTrigger aria-required="true" className={`w-full ${errors.categoryId ? "border-red-500" : ""}`}>
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
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel required htmlFor="amount">Amount</FieldLabel>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => handleFieldChange("source", e.target.value)}
                  placeholder="Enter income source"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel required htmlFor="date">Income Date</FieldLabel>
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
                <Label>Collection Method</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value: FinancePaymentMethod) =>
                    handleFieldChange("method", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
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
                  value={formData.status}
                  onValueChange={(value: IncomeStatus) =>
                    handleFieldChange("status", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder="Enter income description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
