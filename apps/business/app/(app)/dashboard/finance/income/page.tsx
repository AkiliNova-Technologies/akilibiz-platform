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
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";
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

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
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
  const { t } = useI18n();
  const {
    incomeEntries,
    incomeSummary,
    incomeCategories,
    loading,
    error, lastSuccessfulSync, isStale,
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
      toast.error(t("income.saveFailed"));
      return;
    }
    toast.success(t("income.saved"));
    setFormOpen(false);
    setForm(freshForm());
  };
  const fields: TableField<Row>[] = [
    {
      key: "reference",
      header: t("finance.reference"),
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "category",
      header: t("finance.category"),
      align: "center",
      enableSorting: true,
    },
    {
      key: "source",
      header: t("income.source"),
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{String(value || "-")}</span>
      ),
    },
    {
      key: "amount",
      header: t("finance.amount"),
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
      header: t("finance.method"),
      align: "center",
      cell: (value) => <MethodBadge method={String(value)} />,
    },
    {
      key: "date",
      header: t("finance.date"),
      align: "center",
      enableSorting: true,
      cell: (value) => formatFinanceDate(String(value)),
    },
    {
      key: "status",
      header: t("reports.status"),
      align: "center",
      cell: (value) => <StatusBadge status={String(value)} />,
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: t("income.view"), onClick: openDetails },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">{t("income.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("income.description")}
            </p>
          </div>
          <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
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
              title={t("income.total")}
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.total_income) : "—"}
              description={t("income.totalDescription")}
              icon={<ArrowUp className="size-5" />}
            />
            <MetricCard
              title={t("income.received")}
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.received_income) : "—"}
              description={t("income.receivedDescription")}
              icon={<IconCash className="size-5" />}
            />
            <MetricCard
              title={t("income.pending")}
              value={incomeSummary ? formatFinanceCurrency(incomeSummary.pending_income) : "—"}
              description={t("income.pendingDescription")}
              icon={<WalletCards className="size-5" />}
            />
            <MetricCard
              title={t("income.categories")}
              value={incomeSummary ? String(incomeSummary.income_categories) : "—"}
              description={t("income.categoriesDescription")}
              icon={<CircleDollarSign className="size-5" />}
            />
          </section>
          <Card>
            <CardContent>
              <DataTable<Row>
                title={t("income.register")}
                description={t("income.registerDescription")}
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder={t("income.search")}
                pageSize={10}
                loading={loading}
                onRowClick={openDetails}
                emptyMessage="Income records are unavailable until the hosted finance service is connected."
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void refreshIncome()}
                      disabled size="icon" aria-label={t("pos.refresh")} title={t("pos.refresh")}>
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
                      {t("income.record")}
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
            <DialogTitle>{t("income.details")}</DialogTitle>
            <DialogDescription>
              {t("income.detailsDescription")}
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
                  <span className="text-sm text-muted-foreground">{t("finance.method")}</span>
                  <MethodBadge method={selected.method} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("finance.date")}</span>
                  <span className="font-medium">
                    {formatFinanceDate(selected.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("reports.status")}</span>
                  <StatusBadge status={selected.status} />
                </div>
                {selected.description ? (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        {t("finance.description")}
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
            <DialogTitle>{t("income.record")}</DialogTitle>
            <DialogDescription>
              {t("income.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>{t("finance.category")}</FieldLabel>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setField("categoryId", value)}>
                  <SelectTrigger
                    className={`w-full ${errors.categoryId ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={t("productForm.selectCategory")} />
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
                <FieldLabel required>{t("finance.amount")}</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) => setField("amount", event.target.value)}
                  placeholder={t("income.enterAmount")}
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount ? (
                  <p className="text-sm text-red-500">{errors.amount}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("income.source")}</Label>
                <Input
                  value={form.source}
                  onChange={(event) => setField("source", event.target.value)}
                  placeholder={t("income.enterSource")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>{t("income.incomeDate")}</FieldLabel>
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
                <Label>{t("income.collectionMethod")}</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) =>
                    setField("method", value as FinancePaymentMethod)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("income.selectMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("pos.cash")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("finance.cashflow.bankTransfer")}</SelectItem>
                    <SelectItem value="mobile_money">{t("pos.mobileMoney")}</SelectItem>
                    <SelectItem value="card">{t("pos.card")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("reports.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as IncomeStatus)
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("income.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("sales.pending")}</SelectItem>
                    <SelectItem value="received">{t("income.receivedStatus")}</SelectItem>
                    <SelectItem value="verified">{t("income.verifiedStatus")}</SelectItem>
                    <SelectItem value="cancelled">{t("sales.cancelledStatus")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.description")}</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                placeholder={t("income.enterDescription")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}>
              {t("common.cancel")}
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
