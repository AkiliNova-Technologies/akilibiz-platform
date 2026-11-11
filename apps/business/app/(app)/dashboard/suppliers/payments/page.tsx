"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote as IconCash,
  Check,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  Smartphone,
  TrendingDown,
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
  type SupplierPayment,
  type SupplierPaymentMethod,
  type SupplierPaymentPayload,
  type SupplierPaymentStatus,
  useSupplierPaymentsData,
} from "@/components/akilibiz/suppliers/supplier-payments-data";
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";
import { usePurchaseOrdersData } from "@/components/akilibiz/suppliers/purchase-orders-data";
import {
  formatSupplierCurrency,
  useSuppliersData,
} from "@/components/akilibiz/suppliers/suppliers-data";
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

type PaymentRow = SupplierPayment & TableData;
type FormState = {
  payment_ref: string;
  supplier_id: string;
  purchase_order_id: string;
  total_invoice_amount: string;
  amount_paid: string;
  payment_date: string;
  due_date: string;
  payment_method: SupplierPaymentMethod;
  status: SupplierPaymentStatus;
  notes: string;
};
const methods: SupplierPaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "Mobile Money",
  "Cheque",
];
const statuses: SupplierPaymentStatus[] = [
  "Pending",
  "Partial",
  "Paid",
  "Overdue",
];
const today = () => new Date().toISOString().slice(0, 10);
function blank(): FormState {
  return {
    payment_ref: `PAY-${today().replaceAll("-", "")}-${String(Date.now()).slice(-3)}`,
    supplier_id: "",
    purchase_order_id: "",
    total_invoice_amount: "",
    amount_paid: "",
    payment_date: today(),
    due_date: "",
    payment_method: "Bank Transfer",
    status: "Pending",
    notes: "",
  };
}
function MethodBadge({ method }: { method: SupplierPaymentMethod }) {
  const Icon =
    method === "Cash"
      ? IconCash
      : method === "Mobile Money"
        ? Smartphone
        : method === "Cheque"
          ? CreditCard
          : Landmark;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="size-3.5" />
      {method}
    </Badge>
  );
}
function StatusBadge({ status }: { status: SupplierPaymentStatus }) {
  return (
    <Badge variant={status === "Overdue" ? "destructive" : "outline"}>
      {status}
    </Badge>
  );
}

export default function SupplierPaymentsPage() {
  const { payments, loading, error, lastSuccessfulSync, isStale, summary, getPayments, addPayment, editPayment, markSettled } =
    useSupplierPaymentsData();
  useEffect(() => { void getPayments(); }, [getPayments]);
  const { suppliers } = useSuppliersData();
  const { orders } = usePurchaseOrdersData();
  const [formOpen, setFormOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [detail, setDetail] = useState<PaymentRow | null>(null);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const supplierOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !form.supplier_id || order.supplier_id === Number(form.supplier_id),
      ),
    [form.supplier_id, orders],
  );
  const visible = useMemo(
    () =>
      payments.filter(
        (payment) =>
          (statusFilter === "all" || payment.status === statusFilter) &&
          (!dateFilter || payment.payment_date === dateFilter),
      ),
    [payments, statusFilter, dateFilter],
  );
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const open = (allocation = false) => {
    setEditing(null);
    setForm(blank());
    setFormOpen(!allocation);
    setAllocationOpen(allocation);
  };
  const edit = (row: PaymentRow) => {
    setEditing(row);
    setForm({
      payment_ref: row.payment_ref,
      supplier_id: String(row.supplier_id),
      purchase_order_id: row.purchase_order_id
        ? String(row.purchase_order_id)
        : "",
      total_invoice_amount: String(row.total_invoice_amount),
      amount_paid: String(row.amount_paid),
      payment_date: row.payment_date,
      due_date: row.due_date ?? "",
      payment_method: row.payment_method,
      status: row.status,
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };
  const settle = async (row: PaymentRow) => {
    await markSettled(row.id);
    setDetail(null);
    toast.success("Payment marked as settled");
  };
  const save = async () => {
    const supplier = suppliers.find(
      (item) => item.id === Number(form.supplier_id),
    );
    const order = orders.find(
      (item) => item.id === Number(form.purchase_order_id),
    );
    const invoice = Number(form.total_invoice_amount);
    const paid = Number(form.amount_paid);
    if (
      !form.payment_ref.trim() ||
      !supplier ||
      !Number.isSafeInteger(invoice) ||
      invoice < 0 ||
      !Number.isSafeInteger(paid) ||
      paid <= 0 ||
      !form.payment_date
    ) {
      toast.error(
        "Reference, supplier, whole-UGX amounts, and payment date are required",
      );
      return;
    }
    if (order && order.supplier_id !== supplier.id) {
      toast.error("The selected purchase order belongs to another supplier");
      return;
    }
    if (invoice > 0 && paid > invoice) {
      toast.error("Payment amount cannot exceed the invoice total");
      return;
    }
    const payload: SupplierPaymentPayload & { supplier_name: string } = {
      payment_ref: form.payment_ref.trim(),
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      purchase_order_id: order?.id,
      po_reference: order?.po_number ?? "",
      total_invoice_amount: invoice,
      amount_paid: paid,
      balance_remaining: Math.max(0, invoice - paid),
      payment_date: form.payment_date,
      due_date: form.due_date || undefined,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      await editPayment(editing.id, payload);
      toast.success("Payment updated successfully");
    } else {
      await addPayment(payload);
      toast.success(
        allocationOpen
          ? "Payment allocated successfully"
          : "Payment recorded successfully",
      );
    }
    setFormOpen(false);
    setAllocationOpen(false);
  };
  const fields: TableField<PaymentRow>[] = [
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
      cell: (value) => String(value) || "—",
    },
    {
      key: "amount_paid",
      header: "Amount Paid",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatSupplierCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "balance_remaining",
      header: "Balance",
      align: "right",
      enableSorting: true,
      cell: (value) =>
        Number(value) ? (
          formatSupplierCurrency(Number(value))
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "payment_date",
      header: "Payment Date",
      align: "center",
      enableSorting: true,
    },
    {
      key: "payment_method",
      header: "Method",
      align: "center",
      cell: (value) => <MethodBadge method={value as SupplierPaymentMethod} />,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => <StatusBadge status={value as SupplierPaymentStatus} />,
    },
  ];
  const actions: TableAction<PaymentRow>[] = [
    { type: "view", label: "View payment", onClick: setDetail },
    {
      type: "edit",
      label: "Edit payment",
      onClick: edit,
      disabled: () => true,
    },
    {
      type: "custom",
      label: "Mark settled",
      icon: <Check className="size-4" />,
      onClick: (row) => void settle(row),
      disabled: () => true,
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
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
              value={summary ? String(summary.total_payment_records) : "—"}
              description="All supplier payment entries"
              icon={<ReceiptText className="size-5" />}
            />
            <MetricCard
              title="Total Paid"
              value={summary ? formatSupplierCurrency(summary.total_paid) : "—"}
              description="Amount already paid to suppliers"
              icon={<IconCash className="size-5" />}
            />
            <MetricCard
              title="Outstanding Payables"
              value={summary ? formatSupplierCurrency(summary.total_outstanding) : "—"}
              description="Remaining unpaid supplier balances"
              icon={<WalletCards className="size-5" />}
            />
            <MetricCard
              title="Overdue Payables"
              value={summary ? formatSupplierCurrency(summary.overdue_payables) : "—"}
              description="Supplier balances already past due"
              icon={<TrendingDown className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<PaymentRow>
                title="Supplier Payment Register"
                description="Track supplier settlements, remaining balances, and payment status"
                data={visible as PaymentRow[]}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search by payment ref, supplier, or PO reference..."
                pageSize={10}
                onRowClick={setDetail}
                emptyMessage={
                  loading
                    ? "Loading supplier payments..."
                    : "No supplier payments available."
                }
                toolbarFilters={
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-40"
                      type="date"
                      value={dateFilter}
                      onChange={(event) => setDateFilter(event.target.value)}
                      aria-label="Filter by payment date"
                    />
                  </div>
                }
                toolbarActions={
                  <div className="flex gap-2">
                    <Button variant="outline" disabled title="Supplier payment allocation is not connected" onClick={() => open(true)}>
                      Allocate Payment
                    </Button>
                    <Button disabled title="Supplier payment posting is not connected" onClick={() => open()}>
                      <Plus className="mr-2 size-4" />
                      Record Payment
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
        <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
      </div>
      <Dialog
        open={formOpen || allocationOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFormOpen(false);
            setAllocationOpen(false);
          }
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit Supplier Payment"
                : allocationOpen
                  ? "Allocate Supplier Payment"
                  : "Record Supplier Payment"}
            </DialogTitle>
            <DialogDescription>
              {allocationOpen
                ? "Allocate a payment to one supplier purchase order."
                : "Capture supplier payment details and payable status."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Payment Reference</FieldLabel>
                <Input
                  value={form.payment_ref}
                  onChange={(event) =>
                    update("payment_ref", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Supplier</FieldLabel>
                <Select
                  value={form.supplier_id}
                  onValueChange={(value) => {
                    update("supplier_id", value);
                    update("purchase_order_id", "");
                  }}>
                  <SelectTrigger className="w-full">
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
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchase Order / Invoice</Label>
              <Select
                value={form.purchase_order_id}
                onValueChange={(value) => {
                  const order = orders.find(
                    (item) => item.id === Number(value),
                  );
                  update("purchase_order_id", value);
                  if (order) {
                    update("total_invoice_amount", String(order.total_amount));
                    update("due_date", order.expected_delivery);
                  }
                }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select purchase order or leave unallocated" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOrders.map((order) => (
                    <SelectItem key={order.id} value={String(order.id)}>
                      {order.po_number} —{" "}
                      {formatSupplierCurrency(order.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Total Invoice Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.total_invoice_amount}
                  onChange={(event) =>
                    update("total_invoice_amount", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Amount Paid</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount_paid}
                  onChange={(event) =>
                    update("amount_paid", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Payment Date</FieldLabel>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(event) =>
                    update("payment_date", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(event) => update("due_date", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(value) =>
                    update("payment_method", value as SupplierPaymentMethod)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
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
                    update("status", value as SupplierPaymentStatus)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Optional payment notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setAllocationOpen(false);
              }}>
              Cancel
            </Button>
            <Button disabled onClick={() => void save()}>
              {allocationOpen
                ? "Allocate Payment"
                : editing
                  ? "Update Payment"
                  : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(isOpen) => !isOpen && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Payment Details</DialogTitle>
            <DialogDescription>
              Review payment information, payable balance, and settlement
              status.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {[
                    ["Payment Ref", detail.payment_ref],
                    ["Supplier", detail.supplier_name],
                    ["PO / Invoice Ref", detail.po_reference || "—"],
                    [
                      "Total Invoice",
                      formatSupplierCurrency(detail.total_invoice_amount),
                    ],
                    ["Amount Paid", formatSupplierCurrency(detail.amount_paid)],
                    [
                      "Balance Remaining",
                      formatSupplierCurrency(detail.balance_remaining),
                    ],
                    ["Payment Date", detail.payment_date],
                    ["Due Date", detail.due_date || "—"],
                    ["Recorded By", detail.recorded_by],
                  ].map(([label, value], index) => (
                    <div key={label}>
                      {index === 3 || index === 6 ? (
                        <Separator className="mb-3" />
                      ) : null}
                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-right font-medium">{value}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Method
                    </span>
                    <MethodBadge method={detail.payment_method} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <StatusBadge status={detail.status} />
                  </div>
                  {detail.notes ? (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">
                          Notes
                        </p>
                        <p className="text-sm">{detail.notes}</p>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
              {detail.status !== "Paid" ? (
                <Button className="w-full" disabled>
                  <Check className="mr-2 size-4" />
                  Mark Settled
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
