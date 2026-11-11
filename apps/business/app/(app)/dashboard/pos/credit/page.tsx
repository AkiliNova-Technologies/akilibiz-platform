"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Banknote, Receipt, AlertTriangle, Clock, WalletCards } from "lucide-react";
import {
  DataTable,
  type TableField,
  type TableAction,
  type TableData,
} from "@/components/akilibiz/data-table";
import { useCreditOrdersData } from "@/components/akilibiz/credit-orders/credit-orders-data";
import { RiskBadge } from "@/components/akilibiz/risk-badge";
import { toast } from "sonner";
import MetricCard from "@/components/akilibiz/metric-card";

// ============================================================================
// TYPES
// ============================================================================

interface CreditOrder extends TableData {
  id: number;
  sale_number: string;
  customer_name: string;
  customer_id: number | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  due_date?: string | null;
  created_at: string;
  status: string;
  items_count: number;
  risk_level?: string;
  risk_score?: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDaysOverdue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = now.getTime() - due.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreditOrdersPage() {
  const { sales, getSales, recordSalePayment, loading, scores, getCustomerRisk } = useCreditOrdersData();
  // Financial records and posting are not available in the hosted credit service yet.
  const creditDataAvailable = false;
  const paymentPostingAvailable = false;

  const [selectedOrder, setSelectedOrder] = useState<CreditOrder | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentRequestKey, setPaymentRequestKey] = useState("");

  useEffect(() => {
    void getSales({ limit: 500 });
  }, [getSales]);

  useEffect(() => {
    // Fetch risk scores for customers with credit orders
    const creditOrders = sales.filter((sale) => sale.balance_due > 0);
    const customerIds = new Set(
      creditOrders
        .map((sale) => sale.customer_id)
        .filter((id): id is number => id !== null && id !== undefined),
    );

    customerIds.forEach((customerId) => {
      if (!scores[customerId]) {
        getCustomerRisk(customerId);
      }
    });
  }, [sales, scores, getCustomerRisk]);

  const creditOrders = useMemo<CreditOrder[]>(() => {
    return sales
      .filter((sale) => sale.balance_due > 0 || sale.payment_status !== "paid")
      .map((sale) => {
        const customerRisk = sale.customer_id ? scores[sale.customer_id] : null;
        return {
          ...sale,
          id: sale.id,
          customer_id: sale.customer_id ?? null,
          due_date: sale.due_date ?? null,
          risk_level: customerRisk?.level || undefined,
          risk_score: customerRisk?.score || undefined,
        };
      });
  }, [sales, scores]);

  const totalOutstanding = useMemo(() => {
    return creditOrders.reduce((sum, order) => sum + order.balance_due, 0);
  }, [creditOrders]);

  const overdueOrders = useMemo(() => {
    return creditOrders.filter(
      (order) =>
        order.due_date &&
        getDaysOverdue(order.due_date) > 0 &&
        order.payment_status !== "paid",
    );
  }, [creditOrders]);

  const partiallyPaidOrders = useMemo(() => {
    return creditOrders.filter((order) => order.payment_status === "partial");
  }, [creditOrders]);

  const unpaidOrders = useMemo(() => {
    return creditOrders.filter((order) => order.payment_status === "unpaid");
  }, [creditOrders]);

  const handleRecordPayment = (row: CreditOrder) => {
    if (!paymentPostingAvailable) return;
    setSelectedOrder(row);
    setPaymentAmount(String(row.balance_due));
    setPaymentMethod("cash");
    setPaymentRequestKey(crypto.randomUUID());
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentPostingAvailable || !selectedOrder) return;

    const amount = Number(paymentAmount);
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > selectedOrder.balance_due
    ) {
      toast.error("Payment must be a whole UGX amount within the outstanding balance");
      return;
    }

    try {
      const result = await recordSalePayment(selectedOrder.id, {
        amount,
        payment_method: paymentMethod,
        payment_reference: null,
        notes: "Credit order payment",
        idempotency_key: paymentRequestKey,
      });

      if (result) {
        toast.success(`Payment recorded for ${selectedOrder.sale_number}`);
        setPaymentDialogOpen(false);
        setSelectedOrder(null);
        setPaymentAmount("");
        await getSales({ limit: 500 });
      }
    } catch {
      toast.error("Credit payment recording is unavailable.");
    }
  };

  const handleRefresh = async () => {
    if (!creditDataAvailable) return;
    await getSales({ limit: 500 });
    toast.success("Credit orders refreshed");
  };

  // Define table fields
  const fields: TableField<CreditOrder>[] = [
    {
      key: "sale_number",
      header: "Invoice",
      cell: (value) => (
        <span className="font-mono text-xs">{String(value)}</span>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "risk_level",
      header: "Risk",
      cell: (_value, row) => {
        if (row.risk_level && row.risk_score !== undefined) {
          return <RiskBadge level={row.risk_level} score={row.risk_score} />;
        }
        return <Badge variant="outline">N/A</Badge>;
      },
    },
    {
      key: "total_amount",
      header: "Total",
      align: "right",
      cell: (value) => formatCurrency(Number(value)),
    },
    {
      key: "amount_paid",
      header: "Paid",
      align: "right",
      cell: (value) => formatCurrency(Number(value)),
    },
    {
      key: "balance_due",
      header: "Balance",
      align: "right",
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      cell: (value) => formatDate(value as string | null | undefined),
    },
    {
      key: "payment_status",
      header: "Status",
      cell: (value) => {
        const status = String(value).toLowerCase();
        switch (status) {
          case "paid":
            return <Badge variant="secondary">Paid</Badge>;
          case "partial":
            return <Badge variant="outline">Partial</Badge>;
          case "unpaid":
            return <Badge variant="destructive">Unpaid</Badge>;
          default:
            return <Badge variant="outline">{String(value)}</Badge>;
        }
      },
    },
    {
      key: "created_at",
      header: "Order Date",
      cell: (value) => formatDate(String(value)),
    },
  ];

  // Define table actions
  const actions: TableAction<CreditOrder>[] = [
    {
      type: "custom",
      label: "Record Payment",
      icon: <Banknote className="size-4" />,
      onClick: handleRecordPayment,
      disabled: (row) => !paymentPostingAvailable || row.balance_due <= 0,
    },
  ];

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 pb-4 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Credit Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Track outstanding balances, overdue payments, and customer credit risk.
            </p>
          </div>
          {/* SUMMARY METRIC CARDS */}
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Outstanding"
              value={creditDataAvailable ? formatCurrency(totalOutstanding) : "—"}
              description={creditDataAvailable ? `Across ${creditOrders.length} credit orders` : "Balance data unavailable"}
              icon={<Receipt className="size-5" />}
            />
            <MetricCard
              title="Overdue Orders"
              value={creditDataAvailable ? String(overdueOrders.length) : "—"}
              description={
                !creditDataAvailable ? "Overdue orders unavailable" : overdueOrders.length > 0
                  ? "Require immediate attention"
                  : "No overdue orders"
              }
              icon={<AlertTriangle className="size-5" />}
            />

            <MetricCard
              title="Partially Paid"
              value={creditDataAvailable ? String(partiallyPaidOrders.length) : "—"}
              description={creditDataAvailable ? "Payments in progress" : "Payment status unavailable"}
              icon={<Clock className="size-5" />}
            />

            <MetricCard
              title="Unpaid Orders"
              value={creditDataAvailable ? String(unpaidOrders.length) : "—"}
              description={creditDataAvailable ? "Awaiting first payment" : "Payment status unavailable"}
              icon={<WalletCards className="size-5" />}
            />
          </section>

          {/* CREDIT ORDERS TABLE */}
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<CreditOrder>
                data={creditOrders}
                fields={fields}
                actions={actions}
                title="Credit Orders"
                description="Track and manage customer credit orders"
                loading={loading}
                enableSelection={false}
                enablePagination={true}
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                enableGlobalSearch={true}
                searchPlaceholder="Search by invoice or customer..."
                enableColumnVisibility={true}
                enableSorting={true}
                emptyMessage="No credit orders available."
                onRefresh={handleRefresh}
                refreshing={loading}
                refreshDisabled={!creditDataAvailable}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PAYMENT DIALOG */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for{" "}
              <span className="font-medium">{selectedOrder?.sale_number}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <Card className="border-border/60 py-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">
                    {selectedOrder?.customer_name}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Due</span>
                  <span className="font-medium">
                    {formatCurrency(selectedOrder?.total_amount || 0)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-medium">
                    {formatCurrency(selectedOrder?.amount_paid || 0)}
                  </span>
                </div>
                <div className="my-3 border-t" />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Outstanding Balance</span>
                  <span className="text-destructive">
                    {formatCurrency(selectedOrder?.balance_due || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                step="1"
                max={selectedOrder?.balance_due}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card / Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={loading}>
              Cancel
            </Button>

            <Button onClick={handleSubmitPayment} disabled={!paymentPostingAvailable || loading}>
              {loading ? "Recording..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
