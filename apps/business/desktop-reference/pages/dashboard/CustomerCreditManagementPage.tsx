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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconAlertTriangle,
  IconCash,
  IconCreditCard,
  IconReceipt,
  IconUserDollar,
  IconWallet,
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import MetricCard from "@/components/metric-card";
import { useReduxCustomers } from "@/hooks/useReduxCustomers";
import { useReduxSales } from "@/hooks/useReduxSales";
import {
  tauriSalesService,
  type SalePaymentHistoryEntry,
} from "@/services/tauri/sales";
import type {
  CreditStatus,
  CustomerCreditRow as CustomerCreditAccount,
  RiskLevel,
} from "@/services/tauri/customers";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerCreditRow extends TableData {
  id: number;
  customer_name: string;
  phone: string;
  credit_limit: number;
  outstanding_balance: number;
  overdue_amount: number;
  last_payment_date?: string | null;
  due_date?: string | null;
  days_overdue: number;
  risk_level: RiskLevel;
  status: CreditStatus;
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

function getStatusBadge(status: CreditStatus) {
  switch (status) {
    case "Current":
      return <Badge variant="outline">Current</Badge>;
    case "Due Soon":
      return <Badge variant="outline">Due Soon</Badge>;
    case "Overdue":
      return <Badge variant="outline">Overdue</Badge>;
    case "Critical":
      return <Badge variant="destructive">Critical</Badge>;
  }
}

function getRiskBadge(risk: RiskLevel) {
  switch (risk) {
    case "Low":
      return <Badge variant="outline">Low</Badge>;
    case "Medium":
      return <Badge variant="outline">Medium</Badge>;
    case "High":
      return <Badge variant="destructive">High</Badge>;
  }
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// PAGE
// ============================================================================

export default function CustomerCreditManagementPage() {
  const { creditAccounts, loading, getCreditAccounts } = useReduxCustomers();
  const { sales, getSales, recordSalePayment } = useReduxSales();

  const [selectedAccount, setSelectedAccount] =
    React.useState<CustomerCreditRow | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentSaleId, setPaymentSaleId] = React.useState<string>("");
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [paymentRequestKey, setPaymentRequestKey] = React.useState("");
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historySaleId, setHistorySaleId] = React.useState("");
  const [paymentHistory, setPaymentHistory] = React.useState<
    SalePaymentHistoryEntry[]
  >([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getCreditAccounts();
  }, [getCreditAccounts]);

  const eligibleSales = React.useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.customer_id === selectedAccount?.id &&
          sale.status !== "cancelled" &&
          sale.balance_due > 0,
      ),
    [sales, selectedAccount?.id],
  );

  const openPayment = async (account: CustomerCreditRow) => {
    setSelectedAccount(account);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentRequestKey(crypto.randomUUID());
    setPaymentError(null);
    setPaymentSaleId("");
    setPaymentOpen(true);
    try {
      const currentSales = await getSales({ limit: 500 });
      const firstEligible = currentSales.find(
        (sale) =>
          sale.customer_id === account.id &&
          sale.status !== "cancelled" &&
          sale.balance_due > 0,
      );
      if (firstEligible) {
        setPaymentSaleId(String(firstEligible.id));
        setPaymentAmount(String(firstEligible.balance_due));
      }
    } catch {
      setPaymentError(
        "Unable to load this customer's credit sales. Please try again.",
      );
    }
  };

  const selectedSale = eligibleSales.find(
    (sale) => String(sale.id) === paymentSaleId,
  );
  const historySale = eligibleSales.find(
    (sale) => String(sale.id) === historySaleId,
  );
  const loadHistory = async (customerId: number, saleId: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setPaymentHistory(
        await tauriSalesService.getSalePaymentHistory(customerId, saleId),
      );
    } catch {
      setPaymentHistory([]);
      setHistoryError("Payment history could not be loaded. Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };
  const openHistory = async (account: CustomerCreditRow) => {
    setSelectedAccount(account);
    setHistorySaleId("");
    setPaymentHistory([]);
    setHistoryError(null);
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const currentSales = await getSales({ limit: 500 });
      const firstEligible = currentSales.find(
        (sale) =>
          sale.customer_id === account.id &&
          sale.status !== "cancelled" &&
          sale.balance_due > 0,
      );
      if (firstEligible) {
        setHistorySaleId(String(firstEligible.id));
        await loadHistory(account.id, firstEligible.id);
      }
    } catch {
      setHistoryError("Unable to load this customer's credit sales. Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };
  const submitPayment = async () => {
    if (!selectedSale || submittingPayment) return;
    const amount = Number(paymentAmount);
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > selectedSale.balance_due
    ) {
      setPaymentError(
        "Enter a whole UGX amount greater than zero and no more than the outstanding balance.",
      );
      return;
    }
    setSubmittingPayment(true);
    setPaymentError(null);
    const result = await recordSalePayment(selectedSale.id, {
      amount,
      payment_method: paymentMethod,
      payment_reference: paymentReference.trim() || null,
      notes: paymentNotes.trim() || null,
      idempotency_key: paymentRequestKey,
    });
    setSubmittingPayment(false);
    if (!result) {
      setPaymentError(
        "Payment could not be recorded. Check the live balance and try again.",
      );
      return;
    }
    await Promise.all([getCreditAccounts(), getSales({ limit: 500 })]);
    if (selectedAccount && Number(historySaleId) === selectedSale.id) {
      await loadHistory(selectedAccount.id, selectedSale.id);
    }
    setPaymentOpen(false);
    setDetailsOpen(false);
  };

  const rows = React.useMemo<CustomerCreditRow[]>(() => {
    return creditAccounts.map((row: CustomerCreditAccount) => ({
      id: row.id,
      customer_name: row.customer_name,
      phone: row.phone || "—",
      credit_limit: row.credit_limit,
      outstanding_balance: row.outstanding_balance,
      overdue_amount: row.overdue_amount,
      last_payment_date: row.last_payment_date,
      due_date: row.due_date,
      days_overdue: row.days_overdue,
      risk_level: row.risk_level,
      status: row.status,
    }));
  }, [creditAccounts]);

  const totalCreditCustomers = rows.length;
  const totalOutstanding = rows.reduce(
    (sum, row) => sum + row.outstanding_balance,
    0,
  );
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdue_amount, 0);
  const overdueAccounts = rows.filter((row) => row.overdue_amount > 0).length;

  const creditFields: TableField<CustomerCreditRow>[] = [
    {
      key: "customer_name",
      header: "Customer",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "credit_limit",
      header: "Credit Limit",
      align: "right",
      enableSorting: true,
      cell: (value) => <span>{formatCurrency(Number(value))}</span>,
    },
    {
      key: "outstanding_balance",
      header: "Outstanding",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "overdue_amount",
      header: "Overdue",
      align: "right",
      enableSorting: true,
      cell: (value) => {
        const overdue = Number(value);
        return overdue > 0 ? (
          <span className="font-semibold text-destructive">
            {formatCurrency(overdue)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "due_date",
      header: "Due Date",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDisplayDate(String(value || ""))}
        </span>
      ),
    },
    {
      key: "days_overdue",
      header: "Days Overdue",
      align: "center",
      enableSorting: true,
      cell: (value) => {
        const days = Number(value);
        return days > 0 ? (
          <Badge variant="outline">{days} days</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "risk_level",
      header: "Risk",
      align: "center",
      cell: (value) => getRiskBadge(value as RiskLevel),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(value as CreditStatus),
    },
  ];

  const creditActions: TableAction<CustomerCreditRow>[] = [
    {
      type: "view",
      label: "View account",
      onClick: (row) => {
        setSelectedAccount(row);
        setDetailsOpen(true);
      },
    },
    {
      type: "custom",
      label: "Record payment",
      icon: <IconCash className="size-4" />,
      onClick: (row) => {
        void openPayment(row);
      },
    },
    {
      type: "custom",
      label: "View history",
      icon: <IconReceipt className="size-4" />,
      onClick: (row) => {
        void openHistory(row);
      },
    },
  ];

  return (
    <>
      <SiteHeader label="Customer Credit Management" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Credit Accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              Track customer balances, overdue accounts, and credit collection
              priorities.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Credit Customers"
              value={String(totalCreditCustomers)}
              description="Customers currently using credit"
              icon={<IconUserDollar className="size-5" />}
            />

            <MetricCard
              title="Total Outstanding"
              value={formatCurrency(totalOutstanding)}
              description="Open customer balances"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title="Overdue Balance"
              value={formatCurrency(totalOverdue)}
              description="Balances already past due date"
              icon={<IconAlertTriangle className="size-5" />}
            />

            <MetricCard
              title="Overdue Accounts"
              value={String(overdueAccounts)}
              description="Customers with overdue balances"
              icon={<IconCreditCard className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<CustomerCreditRow>
                title="Customer Credit Ledger"
                description="Monitor balances, overdue accounts, and account risk"
                data={rows}
                fields={creditFields}
                actions={creditActions}
                enableGlobalSearch
                searchPlaceholder="Search by customer name or phone..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedAccount(row);
                  setDetailsOpen(true);
                }}
                emptyMessage={
                  loading
                    ? "Loading credit accounts..."
                    : "No customer credit accounts found."
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit Account Details</DialogTitle>
            <DialogDescription>
              Review customer credit position and collection status.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Customer
                    </span>
                    <span className="font-medium">
                      {selectedAccount.customer_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="font-medium">{selectedAccount.phone}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Credit Limit
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedAccount.credit_limit)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Outstanding
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedAccount.outstanding_balance)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Overdue
                    </span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(selectedAccount.overdue_amount)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Last Payment
                    </span>
                    <span className="font-medium">
                      {formatDisplayDate(selectedAccount.last_payment_date)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Due Date
                    </span>
                    <span className="font-medium">
                      {formatDisplayDate(selectedAccount.due_date)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Risk</span>
                    {getRiskBadge(selectedAccount.risk_level)}
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(selectedAccount.status)}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  View Statement
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => void openPayment(selectedAccount)}>
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment against one of {selectedAccount?.customer_name}'s
              outstanding credit sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-sale">Credit sale</Label>
              <Select
                value={paymentSaleId}
                onValueChange={(value) => {
                  setPaymentSaleId(value);
                  const sale = eligibleSales.find(
                    (item) => String(item.id) === value,
                  );
                  if (sale) setPaymentAmount(String(sale.balance_due));
                }}>
                <SelectTrigger id="credit-sale" className="w-full">
                  <SelectValue placeholder="Select an outstanding sale" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSales.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {sale.sale_number} · {formatCurrency(sale.balance_due)}{" "}
                      due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleSales.length === 0 && !paymentError && (
                <p className="text-sm text-muted-foreground">
                  No eligible outstanding credit sales were found.
                </p>
              )}
            </div>
            {selectedSale && (
              <Card className="py-0">
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice</span>
                    <span>{selectedSale.sale_number}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Live outstanding balance</span>
                    <span>{formatCurrency(selectedSale.balance_due)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <Label htmlFor="credit-payment-amount">Payment amount</Label>
              <Input
                id="credit-payment-amount"
                type="number"
                min="1"
                step="1"
                max={selectedSale?.balance_due}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                disabled={!selectedSale || submittingPayment}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card / Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-payment-reference">
                Reference (optional)
              </Label>
              <Input
                id="credit-payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                disabled={submittingPayment}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-payment-notes">Note (optional)</Label>
              <Input
                id="credit-payment-notes"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                disabled={submittingPayment}
              />
            </div>
            {paymentError && (
              <p role="alert" className="text-sm text-destructive">
                {paymentError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={submittingPayment}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitPayment()}
              disabled={!selectedSale || submittingPayment}>
              {submittingPayment ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit Payment History</DialogTitle>
            <DialogDescription>
              Recorded sale-payment facts for {selectedAccount?.customer_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history-credit-sale">Credit sale</Label>
              <Select
                value={historySaleId}
                onValueChange={(value) => {
                  setHistorySaleId(value);
                  if (selectedAccount) {
                    void loadHistory(selectedAccount.id, Number(value));
                  }
                }}
              >
                <SelectTrigger id="history-credit-sale">
                  <SelectValue placeholder="Select an outstanding sale" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSales.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {sale.sale_number} · {formatCurrency(sale.balance_due)} due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {historyLoading && (
              <p className="text-sm text-muted-foreground">
                Loading payment history…
              </p>
            )}
            {historyError && (
              <p role="alert" className="text-sm text-destructive">
                {historyError}
              </p>
            )}
            {!historyLoading && !historyError && historySale && paymentHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No payments have been recorded for this credit sale.
              </p>
            )}
            {!historyLoading && !historyError && paymentHistory.length > 0 && (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <Card key={payment.id} className="py-0">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Date</span>
                        <span>{formatDisplayDate(payment.payment_date)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Method</span>
                        <span className="capitalize">
                          {payment.payment_method.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Reference</span>
                        <span>{payment.payment_reference || "—"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between gap-4 font-semibold">
                        <span>Payment</span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Balance after payment
                        </span>
                        <span>{formatCurrency(payment.remaining_balance)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!historyLoading && !historyError && !historySale && (
              <p className="text-sm text-muted-foreground">
                No outstanding credit sales were found for this customer.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
