import * as React from "react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  IconCash,
  IconCheck,
  IconCreditCard,
  IconDeviceMobile,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconTrendingDown,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxSupplierPayments } from "@/hooks/useReduxSupplierPayments";
import { useReduxSuppliers } from "@/hooks/useReduxSuppliers";
import type {
  AllocateSupplierPaymentPayload,
  SupplierPaymentMethod,
  SupplierPaymentResponse,
  SupplierPaymentStatus,
  CreateSupplierPaymentPayload,
  UpdateSupplierPaymentPayload,
} from "@/services/tauri/supplier-payments";
import { tauriSupplierPaymentsService } from "@/services/tauri/supplier-payments";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

type PaymentMethod = SupplierPaymentMethod;
type PaymentStatus = SupplierPaymentStatus;

interface SupplierPaymentRow extends TableData {
  id: number;
  payment_ref: string;
  supplier_id: number;
  supplier_name: string;
  po_reference: string;
  total_invoice_amount: number;
  amount_paid: number;
  balance_remaining: number;
  payment_date: string;
  due_date: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  recorded_by: string;
  notes?: string;
}

interface SupplierPaymentFormData {
  payment_ref: string;
  supplier_id: string;
  po_reference: string;
  total_invoice_amount: string;
  amount_paid: string;
  payment_date: string;
  due_date: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  notes: string;
}

interface AllocationFormData {
  payment_ref: string;
  supplier_id: string;
  supplier_payable_id: string;
  amount_ugx: string;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextMonthString() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const day = String(nextMonth.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generatePaymentRef() {
  const prefix = "PAY";
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${prefix}-${dateStr}-${random}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status: PaymentStatus) {
  switch (status) {
    case "Pending":
      return <Badge variant="outline">Pending</Badge>;
    case "Partial":
      return <Badge variant="outline">Partial</Badge>;
    case "Paid":
      return <Badge variant="outline">Paid</Badge>;
    case "Overdue":
      return <Badge variant="destructive">Overdue</Badge>;
  }
}

function getMethodBadge(method: PaymentMethod) {
  switch (method) {
    case "Cash":
      return (
        <Badge variant="outline" className="gap-1">
          <IconCash className="size-3.5" />
          Cash
        </Badge>
      );
    case "Bank Transfer":
      return (
        <Badge variant="outline" className="gap-1">
          <IconWallet className="size-3.5" />
          Bank Transfer
        </Badge>
      );
    case "Mobile Money":
      return (
        <Badge variant="outline" className="gap-1">
          <IconDeviceMobile className="size-3.5" />
          Mobile Money
        </Badge>
      );
    case "Cheque":
      return (
        <Badge variant="outline" className="gap-1">
          <IconCreditCard className="size-3.5" />
          Cheque
        </Badge>
      );
  }
}

function mapPaymentRow(payment: SupplierPaymentResponse): SupplierPaymentRow {
  return {
    id: payment.id,
    payment_ref: payment.payment_ref,
    supplier_id: payment.supplier_id,
    supplier_name: payment.supplier_name,
    po_reference: payment.po_reference || "",
    total_invoice_amount: payment.total_invoice_amount,
    amount_paid: payment.amount_paid,
    balance_remaining: payment.balance_remaining,
    payment_date: payment.payment_date,
    due_date: payment.due_date || "",
    payment_method: payment.payment_method,
    status: payment.status,
    recorded_by: payment.recorded_by_name,
    notes: payment.notes || "",
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupplierPaymentsPage() {
  const {
    payments,
    selectedPayment,
    summary,
    loading,
    getPayments,
    getPayment,
    addPayment,
    editPayment,
    markSettled,
    getSummary,
    clearPayment,
  } = useReduxSupplierPayments();

  const { suppliers, getSuppliers } = useReduxSuppliers();

  const [viewOpen, setViewOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [allocationSubmitting, setAllocationSubmitting] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [editingPaymentId, setEditingPaymentId] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState<SupplierPaymentFormData>({
    payment_ref: "",
    supplier_id: "",
    po_reference: "",
    total_invoice_amount: "",
    amount_paid: "",
    payment_date: getTodayString(),
    due_date: getNextMonthString(),
    payment_method: "Bank Transfer",
    status: "Pending",
    notes: "",
  });
  const [allocationForm, setAllocationForm] = React.useState<AllocationFormData>({
    payment_ref: "",
    supplier_id: "",
    supplier_payable_id: "",
    amount_ugx: "",
    payment_date: getTodayString(),
    payment_method: "Bank Transfer",
    notes: "",
  });

  React.useEffect(() => {
    void Promise.all([getPayments(), getSummary(), getSuppliers()]);
  }, [getPayments, getSummary, getSuppliers]);

  React.useEffect(() => {
    if (!viewOpen && !formOpen) {
      clearPayment();
    }
  }, [viewOpen, formOpen, clearPayment]);

  const rows = React.useMemo<SupplierPaymentRow[]>(() => {
    return payments.map(mapPaymentRow);
  }, [payments]);

  const totalPayments = summary?.total_payment_records ?? rows.length;
  const totalPaid = summary?.total_paid ?? rows.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalOutstanding = summary?.total_outstanding ?? rows.reduce((sum, p) => sum + p.balance_remaining, 0);
  const overduePayables = summary?.overdue_payables ?? rows.filter((p) => p.status === "Overdue").reduce((sum, p) => sum + p.balance_remaining, 0);

  const resetForm = () => {
    setFormData({
      payment_ref: "",
      supplier_id: "",
      po_reference: "",
      total_invoice_amount: "",
      amount_paid: "",
      payment_date: getTodayString(),
      due_date: getNextMonthString(),
      payment_method: "Bank Transfer",
      status: "Pending",
      notes: "",
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.payment_ref.trim()) {
      newErrors.payment_ref = "Payment reference is required";
    }
    if (!formData.supplier_id) {
      newErrors.supplier_id = "Supplier is required";
    }
    if (!formData.payment_date) {
      newErrors.payment_date = "Payment date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof SupplierPaymentFormData, value: string) => {
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
    setEditingPaymentId(null);
    setIsEdit(false);
    setFormOpen(true);
  };

  const handleAllocate = () => {
    setAllocationForm({
      payment_ref: generatePaymentRef(),
      supplier_id: "",
      supplier_payable_id: "",
      amount_ugx: "",
      payment_date: getTodayString(),
      payment_method: "Bank Transfer",
      notes: "",
    });
    setAllocationOpen(true);
  };

  const handleSubmitAllocation = async () => {
    const amount = Number(allocationForm.amount_ugx);
    const payableId = Number(allocationForm.supplier_payable_id);
    if (
      !allocationForm.payment_ref.trim() ||
      !allocationForm.supplier_id ||
      !Number.isSafeInteger(payableId) ||
      payableId <= 0 ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !allocationForm.payment_date
    ) {
      toast.error("Reference, supplier, payable ID, whole-UGX amount, and date are required");
      return;
    }
    const payload: AllocateSupplierPaymentPayload = {
      payment_ref: allocationForm.payment_ref.trim(),
      supplier_id: Number(allocationForm.supplier_id),
      amount_ugx: amount,
      payment_date: allocationForm.payment_date,
      payment_method: allocationForm.payment_method,
      notes: allocationForm.notes.trim() || null,
      allocations: [{ supplier_payable_id: payableId, amount_ugx: amount }],
    };
    setAllocationSubmitting(true);
    try {
      const payment = await tauriSupplierPaymentsService.allocateSupplierPayment(payload);
      toast.success(`Payment ${payment.payment_ref} allocated`);
      setAllocationOpen(false);
      await Promise.all([getPayments(), getSummary()]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setAllocationSubmitting(false);
    }
  };

  const handleEdit = async (payment: SupplierPaymentRow) => {
    const full = await getPayment(payment.id);

    setEditingPaymentId(full.id);
    setFormData({
      payment_ref: full.payment_ref,
      supplier_id: String(full.supplier_id),
      po_reference: full.po_reference || "",
      total_invoice_amount: String(full.total_invoice_amount),
      amount_paid: String(full.amount_paid),
      payment_date: full.payment_date,
      due_date: full.due_date || "",
      payment_method: full.payment_method,
      status: full.status,
      notes: full.notes || "",
    });
    setErrors({});
    setIsEdit(true);
    setFormOpen(true);
  };

  const handleView = async (payment: SupplierPaymentRow) => {
    await getPayment(payment.id);
    setViewOpen(true);
  };

  const handleMarkSettled = async (payment: SupplierPaymentRow) => {
    try {
      await markSettled(payment.id);
      toast.success("Payment marked as settled");
      setViewOpen(false);
      await Promise.all([getPayments(), getSummary()]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as settled");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isEdit && editingPaymentId) {
        const payload: UpdateSupplierPaymentPayload = {
          payment_ref: formData.payment_ref.trim(),
          supplier_id: Number(formData.supplier_id),
          po_reference: formData.po_reference.trim() || null,
          total_invoice_amount: Number(formData.total_invoice_amount || 0),
          amount_paid: Number(formData.amount_paid || 0),
          payment_date: formData.payment_date,
          due_date: formData.due_date || null,
          payment_method: formData.payment_method,
          status: formData.status,
          notes: formData.notes.trim() || null,
        };

        const updated = await editPayment(editingPaymentId, payload);
        if (!updated) {
          toast.error("Failed to update payment");
          return;
        }
        toast.success("Payment updated successfully");
      } else {
        const payload: CreateSupplierPaymentPayload = {
          payment_ref: formData.payment_ref.trim(),
          supplier_id: Number(formData.supplier_id),
          po_reference: formData.po_reference.trim() || null,
          total_invoice_amount: Number(formData.total_invoice_amount || 0),
          amount_paid: Number(formData.amount_paid || 0),
          payment_date: formData.payment_date,
          due_date: formData.due_date || null,
          payment_method: formData.payment_method,
          status: formData.status,
          notes: formData.notes.trim() || null,
        };

        const created = await addPayment(payload);
        if (!created) {
          toast.error("Failed to record payment");
          return;
        }
        toast.success("Payment recorded successfully");
      }

      setFormOpen(false);
      resetForm();
      setEditingPaymentId(null);
      await Promise.all([getPayments(), getSummary()]);
    } catch (error: unknown) {
      console.error("Supplier payment error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentFields: TableField<SupplierPaymentRow>[] = [
    {
      key: "payment_ref",
      header: "Payment Ref",
      enableSorting: true,
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "supplier_name",
      header: "Supplier",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "po_reference",
      header: "PO / Invoice Ref",
      align: "center",
      enableSorting: true,
      cell: (value) => <span>{String(value) || "—"}</span>,
    },
    {
      key: "amount_paid",
      header: "Amount Paid",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "balance_remaining",
      header: "Balance",
      align: "right",
      enableSorting: true,
      cell: (value) => {
        const amount = Number(value);
        return amount > 0 ? (
          <span className="font-medium">{formatCurrency(amount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "payment_date",
      header: "Payment Date",
      align: "center",
      enableSorting: true,
      cell: (value) => formatDate(String(value)),
    },
    {
      key: "payment_method",
      header: "Method",
      align: "center",
      cell: (value) => getMethodBadge(value as PaymentMethod),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(value as PaymentStatus),
    },
  ];

  const paymentActions: TableAction<SupplierPaymentRow>[] = [
    {
      type: "view",
      label: "View payment",
      onClick: handleView,
    },
    {
      type: "edit",
      label: "Edit payment",
      onClick: handleEdit,
      disabled: (row) => row.status === "Paid",
    },
    {
      type: "custom",
      label: "Mark settled",
      icon: <IconCheck className="size-4" />,
      onClick: handleMarkSettled,
      disabled: (row) => row.status === "Paid",
    },
  ];

  return (
    <>
      <SiteHeader label="Supplier Payments" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Supplier Payments
            </h2>
            <p className="text-sm text-muted-foreground">
              Record supplier settlements, monitor outstanding balances, and
              manage payable exposure.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Payment Records"
              value={String(totalPayments)}
              description="All supplier payment entries"
              icon={<IconReceipt className="size-5" />}
            />

            <MetricCard
              title="Total Paid"
              value={formatCurrency(totalPaid)}
              description="Amount already paid to suppliers"
              icon={<IconCash className="size-5" />}
            />

            <MetricCard
              title="Outstanding Payables"
              value={formatCurrency(totalOutstanding)}
              description="Remaining unpaid supplier balances"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title="Overdue Payables"
              value={formatCurrency(overduePayables)}
              description="Supplier balances already past due"
              icon={<IconTrendingDown className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<SupplierPaymentRow>
                title="Supplier Payment Register"
                description="Track supplier settlements, remaining balances, and payment status"
                data={rows}
                fields={paymentFields}
                actions={paymentActions}
                enableGlobalSearch
                searchPlaceholder="Search by payment ref, supplier, or PO reference..."
                pageSize={10}
                onRowClick={handleView}
                emptyMessage={
                  loading
                    ? "Loading supplier payments..."
                    : "No supplier payments found."
                }
                toolbarActions={
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleAllocate}>Allocate Payment</Button>
                    <Button onClick={handleAdd}>
                      <IconPlus className="mr-2 size-4" />
                      Record Payment
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Supplier Payment" : "Record Supplier Payment"}
            </DialogTitle>
            <DialogDescription>
              Capture supplier payment details and payable status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="payment_ref">Payment Reference</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="payment_ref"
                    required
                    value={formData.payment_ref}
                    onChange={(e) => handleFieldChange("payment_ref", e.target.value)}
                    placeholder="Enter payment ref"
                    className={`flex-1 ${errors.payment_ref ? "border-red-500" : ""}`}
                  />
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleFieldChange("payment_ref", generatePaymentRef())}
                      title="Generate payment reference"
                    >
                      <IconRefresh className="size-4" />
                    </Button>
                  )}
                </div>
                {errors.payment_ref && (
                  <p className="text-sm text-red-500">{errors.payment_ref}</p>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel required>Supplier</FieldLabel>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => handleFieldChange("supplier_id", value)}
                >
                  <SelectTrigger aria-required="true" className={errors.supplier_id ? "border-red-500 w-full" : "w-full"}>
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
                {errors.supplier_id && (
                  <p className="text-sm text-red-500">{errors.supplier_id}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="po_reference">PO / Invoice Reference</Label>
              <Input
                id="po_reference"
                value={formData.po_reference}
                onChange={(e) => handleFieldChange("po_reference", e.target.value)}
                placeholder="Enter PO or invoice reference"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_invoice_amount">Total Invoice Amount</Label>
                <Input
                  id="total_invoice_amount"
                  type="number"
                  value={formData.total_invoice_amount}
                  onChange={(e) => handleFieldChange("total_invoice_amount", e.target.value)}
                  placeholder="Enter invoice total"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  value={formData.amount_paid}
                  onChange={(e) => handleFieldChange("amount_paid", e.target.value)}
                  placeholder="Enter amount paid"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="payment_date">Payment Date</FieldLabel>
                <Input
                  id="payment_date"
                  required
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleFieldChange("payment_date", e.target.value)}
                  className={errors.payment_date ? "border-red-500" : ""}
                />
                {errors.payment_date && (
                  <p className="text-sm text-red-500">{errors.payment_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleFieldChange("due_date", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: PaymentMethod) =>
                    handleFieldChange("payment_method", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: PaymentStatus) =>
                    handleFieldChange("status", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Optional payment notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update Payment" : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allocationOpen} onOpenChange={setAllocationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Supplier Payment</DialogTitle>
            <DialogDescription>Allocate a payment to one existing supplier payable.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2"><FieldLabel required>Payment Reference</FieldLabel><Input required value={allocationForm.payment_ref} onChange={(e) => setAllocationForm((p) => ({ ...p, payment_ref: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Supplier</FieldLabel><Select value={allocationForm.supplier_id} onValueChange={(value) => setAllocationForm((p) => ({ ...p, supplier_id: value }))}><SelectTrigger aria-required="true" className="w-full"><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><FieldLabel required>Supplier Payable ID</FieldLabel><Input required type="number" min="1" value={allocationForm.supplier_payable_id} onChange={(e) => setAllocationForm((p) => ({ ...p, supplier_payable_id: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Amount (UGX)</FieldLabel><Input required type="number" min="1" step="1" value={allocationForm.amount_ugx} onChange={(e) => setAllocationForm((p) => ({ ...p, amount_ugx: e.target.value }))} /></div>
            <div className="space-y-2"><FieldLabel required>Payment Date</FieldLabel><Input required type="date" value={allocationForm.payment_date} onChange={(e) => setAllocationForm((p) => ({ ...p, payment_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Payment Method</Label><Select value={allocationForm.payment_method} onValueChange={(value) => setAllocationForm((p) => ({ ...p, payment_method: value as PaymentMethod }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Cheque">Cheque</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={allocationForm.notes} onChange={(e) => setAllocationForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocationOpen(false)} disabled={allocationSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitAllocation} disabled={allocationSubmitting}>{allocationSubmitting ? "Allocating..." : "Allocate Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Payment Details</DialogTitle>
            <DialogDescription>
              Review payment information, payable balance, and settlement status.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Ref</span>
                    <span className="font-mono">{selectedPayment.payment_ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Supplier</span>
                    <span className="font-medium">{selectedPayment.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">PO / Invoice Ref</span>
                    <span className="font-medium">{selectedPayment.po_reference || "—"}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Invoice</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.total_invoice_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount Paid</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance Remaining</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.balance_remaining)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Date</span>
                    <span className="font-medium">{formatDate(selectedPayment.payment_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <span className="font-medium">{formatDate(selectedPayment.due_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Method</span>
                    {getMethodBadge(selectedPayment.payment_method as PaymentMethod)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(selectedPayment.status as PaymentStatus)}
                  </div>

                  {selectedPayment.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedPayment.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {selectedPayment.status !== "Paid" && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleMarkSettled(mapPaymentRow(selectedPayment))}
                  >
                    <IconCheck className="mr-2 size-4" />
                    Mark Settled
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
