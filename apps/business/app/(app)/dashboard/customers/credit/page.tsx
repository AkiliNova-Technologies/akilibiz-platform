"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  ReceiptText,
  UserRoundPen,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { RiskBadge } from "@/components/akilibiz/risk-badge";
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
import {
  type CreditStatus,
  type CustomerCreditRow,
  formatCurrency,
} from "@/components/akilibiz/customers/customers-data";
import {
  type CreditSale,
  type SalePaymentHistoryEntry,
  useCreditManagementData,
} from "@/components/akilibiz/customers/credit-management-data";

type CreditRow = CustomerCreditRow & TableData;
const date = (value?: string | null) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleDateString("en-UG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
const statusBadge = (status: CreditStatus) => (
  <Badge variant={status === "Critical" ? "destructive" : "outline"}>
    {status}
  </Badge>
);

export default function CustomerCreditManagementPage() {
  const {
    creditAccounts,
    loading,
    sales,
    getCreditAccounts,
    getSales,
    getSalePaymentHistory,
    recordSalePayment,
  } = useCreditManagementData();
  const [account, setAccount] = useState<CreditRow | null>(null);
  const [details, setDetails] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaleId, setPaymentSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "mobile_money" | "card">(
    "cash",
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySaleId, setHistorySaleId] = useState("");
  const [history, setHistory] = useState<SalePaymentHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  useEffect(() => {
    void getCreditAccounts();
  }, [getCreditAccounts]);
  const eligible = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.customer_id === account?.id &&
          sale.status !== "cancelled" &&
          sale.balance_due > 0,
      ),
    [account?.id, sales],
  );
  const selectedSale = eligible.find(
    (sale) => String(sale.id) === paymentSaleId,
  );
  const historySale = eligible.find(
    (sale) => String(sale.id) === historySaleId,
  );
  const openPayment = async (row: CreditRow) => {
    setAccount(row);
    setAmount("");
    setMethod("cash");
    setReference("");
    setNotes("");
    setRequestKey(crypto.randomUUID());
    setPaymentError(null);
    setPaymentSaleId("");
    setPaymentOpen(true);
    const current = await getSales();
    const sale = current.find(
      (item) =>
        item.customer_id === row.id &&
        item.status !== "cancelled" &&
        item.balance_due > 0,
    );
    if (sale) {
      setPaymentSaleId(String(sale.id));
      setAmount(String(sale.balance_due));
    } else
      setPaymentError(
        "Unable to load this customer's credit sales. Please try again.",
      );
  };
  const loadHistory = async (customerId: number, saleId: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await getSalePaymentHistory(customerId, saleId));
    } catch {
      setHistory([]);
      setHistoryError("Payment history could not be loaded. Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };
  const openHistory = async (row: CreditRow) => {
    setAccount(row);
    setHistorySaleId("");
    setHistory([]);
    setHistoryError(null);
    setHistoryOpen(true);
    const current = await getSales();
    const sale = current.find(
      (item) =>
        item.customer_id === row.id &&
        item.status !== "cancelled" &&
        item.balance_due > 0,
    );
    if (sale) {
      setHistorySaleId(String(sale.id));
      await loadHistory(row.id, sale.id);
    }
  };
  const submit = async () => {
    if (!selectedSale || submitting) return;
    const value = Number(amount);
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value > selectedSale.balance_due
    ) {
      setPaymentError(
        "Enter a whole UGX amount greater than zero and no more than the outstanding balance.",
      );
      return;
    }
    setSubmitting(true);
    setPaymentError(null);
    const result = await recordSalePayment(selectedSale.id, {
      amount: value,
      payment_method: method,
      payment_reference: reference.trim() || null,
      notes: notes.trim() || null,
      idempotency_key: requestKey,
    });
    setSubmitting(false);
    if (!result) {
      setPaymentError(
        "Payment could not be recorded. Check the live balance and try again.",
      );
      return;
    }
    await getCreditAccounts();
    if (account && Number(historySaleId) === selectedSale.id)
      await loadHistory(account.id, selectedSale.id);
    toast.success("Payment recorded");
    setPaymentOpen(false);
    setDetails(false);
  };
  const rows = creditAccounts as CreditRow[];
  const outstanding = rows.reduce(
    (sum, row) => sum + row.outstanding_balance,
    0,
  );
  const overdue = rows.reduce((sum, row) => sum + row.overdue_amount, 0);
  const fields: TableField<CreditRow>[] = [
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
      cell: (value) =>
        Number(value) > 0 ? (
          <span className="font-semibold text-destructive">
            {formatCurrency(Number(value))}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "due_date",
      header: "Due Date",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {date(String(value || ""))}
        </span>
      ),
    },
    {
      key: "days_overdue",
      header: "Days Overdue",
      align: "center",
      enableSorting: true,
      cell: (value) =>
        Number(value) > 0 ? (
          <Badge variant="outline">{Number(value)} days</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "risk_level",
      header: "Risk",
      align: "center",
      cell: (value) => <RiskBadge level={String(value)} />,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => statusBadge(value as CreditStatus),
    },
  ];
  const actions: TableAction<CreditRow>[] = [
    {
      type: "view",
      label: "View account",
      onClick: (row) => {
        setAccount(row);
        setDetails(true);
      },
    },
    {
      type: "custom",
      label: "Record payment",
      icon: <Banknote className="size-4" />,
      onClick: (row) => void openPayment(row),
    },
    {
      type: "custom",
      label: "View history",
      icon: <ReceiptText className="size-4" />,
      onClick: (row) => void openHistory(row),
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
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
              value={String(rows.length)}
              description="Customers currently using credit"
              icon={<UserRoundPen className="size-5" />}
            />
            <MetricCard
              title="Total Outstanding"
              value={formatCurrency(outstanding)}
              description="Open customer balances"
              icon={<Wallet className="size-5" />}
            />
            <MetricCard
              title="Overdue Balance"
              value={formatCurrency(overdue)}
              description="Balances already past due date"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              title="Overdue Accounts"
              value={String(
                rows.filter((row) => row.overdue_amount > 0).length,
              )}
              description="Customers with overdue balances"
              icon={<CreditCard className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Customer Credit Ledger"
                description="Monitor balances, overdue accounts, and account risk"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search by customer name or phone..."
                pageSize={10}
                onRowClick={(row) => {
                  setAccount(row);
                  setDetails(true);
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
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit Account Details</DialogTitle>
            <DialogDescription>
              Review customer credit position and collection status.
            </DialogDescription>
          </DialogHeader>
          {account && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {[
                    ["Customer", account.customer_name],
                    ["Phone", account.phone],
                    ["Credit Limit", formatCurrency(account.credit_limit)],
                    [
                      "Outstanding",
                      formatCurrency(account.outstanding_balance),
                    ],
                    ["Overdue", formatCurrency(account.overdue_amount)],
                    ["Last Payment", date(account.last_payment_date)],
                    ["Due Date", date(account.due_date)],
                  ].map(([label, value]) => (
                    <div className="flex justify-between gap-4" key={label}>
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <span
                        className={
                          label === "Overdue"
                            ? "font-medium text-destructive"
                            : "font-medium"
                        }>
                        {value}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Risk</span>
                    <RiskBadge level={account.risk_level} />
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {statusBadge(account.status)}
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  View Statement
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void openPayment(account)}>
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
              Record a payment against one of {account?.customer_name}&apos;s
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
                  const sale = eligible.find(
                    (item) => String(item.id) === value,
                  );
                  if (sale) setAmount(String(sale.balance_due));
                }}>
                <SelectTrigger id="credit-sale">
                  <SelectValue placeholder="Select an outstanding sale" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {sale.sale_number} · {formatCurrency(sale.balance_due)}{" "}
                      due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligible.length === 0 && !paymentError && (
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
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!selectedSale || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={method}
                onValueChange={(value: "cash" | "mobile_money" | "card") =>
                  setMethod(value)
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card / Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[
              [
                "credit-payment-reference",
                "Reference (optional)",
                reference,
                setReference,
              ],
              ["credit-payment-notes", "Note (optional)", notes, setNotes],
            ].map(([id, label, value, setter]) => (
              <div className="space-y-2" key={String(id)}>
                <Label htmlFor={String(id)}>{String(label)}</Label>
                <Input
                  id={String(id)}
                  value={String(value)}
                  onChange={(event) =>
                    (setter as (next: string) => void)(event.target.value)
                  }
                  disabled={submitting}
                />
              </div>
            ))}
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
              disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={!selectedSale || submitting}>
              {submitting ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit Payment History</DialogTitle>
            <DialogDescription>
              Recorded sale-payment facts for {account?.customer_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history-credit-sale">Credit sale</Label>
              <Select
                value={historySaleId}
                onValueChange={(value) => {
                  setHistorySaleId(value);
                  if (account) void loadHistory(account.id, Number(value));
                }}>
                <SelectTrigger id="history-credit-sale">
                  <SelectValue placeholder="Select an outstanding sale" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {sale.sale_number} · {formatCurrency(sale.balance_due)}{" "}
                      due
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
            {!historyLoading &&
              !historyError &&
              historySale &&
              history.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No payments have been recorded for this credit sale.
                </p>
              )}
            {!historyLoading &&
              !historyError &&
              history.map((payment) => (
                <Card key={payment.id} className="py-0">
                  <CardContent className="space-y-2 p-4 text-sm">
                    {[
                      ["Date", date(payment.payment_date)],
                      ["Method", payment.payment_method.replace("_", " ")],
                      ["Reference", payment.payment_reference || "—"],
                      ["Payment", formatCurrency(payment.amount)],
                      [
                        "Balance after payment",
                        formatCurrency(payment.remaining_balance),
                      ],
                    ].map(([label, value]) => (
                      <div
                        className={
                          label === "Payment"
                            ? "flex justify-between gap-4 font-semibold"
                            : "flex justify-between gap-4"
                        }
                        key={label}>
                        <span className="text-muted-foreground">{label}</span>
                        <span className="capitalize">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
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
