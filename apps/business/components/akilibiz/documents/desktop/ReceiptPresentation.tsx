// GENERATED from the AkiliBiz Desktop repository (src/components/documents/ReceiptPresentation.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
"use client";

import { DocumentTemplatePreview } from "@/components/akilibiz/documents/desktop/templates/DocumentTemplatePreview";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import type { CanonicalReceipt, ReceiptPresentationContext } from "@/lib/desktop-shared/receipt-types";
import { printProfileFor, profileFromLegacyWidth } from "@/lib/desktop-shared/receipt-print-profiles";
import { formatReceiptDate, formatReceiptMoney, formatReceiptQuantity, type ReceiptBusinessProfile, type ReceiptPresentationSettings } from "@/components/akilibiz/documents/desktop/receipt-presentation-utils";
const width = (value: string) => Math.max(220, Math.min(360, Math.round((Number.parseFloat(value) || 80) * 3.78)));
const Rule = () => <div aria-hidden="true" className="border-t border-dashed border-black/60" />;

/** Visual-only rendering of exact values supplied by Rust's CanonicalReceipt. */
export function ReceiptPresentation({ receipt, settings, businessProfile, context = { mode: "original" }, testId = "receipt-paper", previewItemLimit }: { receipt: CanonicalReceipt; settings: ReceiptPresentationSettings; businessProfile?: ReceiptBusinessProfile | null; context?: ReceiptPresentationContext; testId?: string; previewItemLimit?: number }) {
  const { t, locale } = useI18n();
  const profile = printProfileFor(settings.print_profile ?? profileFromLegacyWidth(settings.receipt_width));
  const methodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash": return t("pos.cash");
      case "mobile_money":
      case "mobile money": return t("pos.mobileMoney");
      case "card": return t("pos.card");
      default: return method;
    }
  };
  const currency = receipt.sale.currency_code;
  const footer = receipt.presentation.footer ?? settings.footer_message;
  const isReprint = context.mode === "reprint" || receipt.presentation.reprint;
  const shownLines = previewItemLimit === undefined ? receipt.lines : receipt.lines.slice(0, Math.max(0, previewItemLimit));
  const hiddenCount = receipt.lines.length - shownLines.length;
  return <DocumentTemplatePreview kind="receipt" data-testid={testId} data-print-profile={profile.id} className={profile.id === "document-a4" ? "w-full max-w-3xl p-8 font-sans text-sm leading-relaxed" : "shrink-0 p-4 font-mono text-[11px] leading-relaxed sm:p-5"} style={{ width: profile.id === "document-a4" ? "min(100%, 794px)" : `min(100%, ${width(profile.paper)}px)` }}>
    <header className="text-center">
      {settings.show_logo && businessProfile?.logo_media_url && <img src={businessProfile.logo_media_url} alt={t("businessProfile.logoAlt")} className="mx-auto mb-2 size-9 rounded-sm object-cover" />}
      <p className="break-words font-sans text-sm font-bold uppercase leading-snug">{receipt.business.name}</p><p className="text-[10px] text-black/70">{isReprint ? t("receipt.reprint") : t("receipt.heading")}</p>
      {receipt.business.address && <p className="break-words">{receipt.business.address}</p>}{receipt.business.phone && <p>Tel: {receipt.business.phone}</p>}{receipt.business.email && <p className="break-all">{receipt.business.email}</p>}{settings.show_tin && receipt.business.tin && <p>TIN: {receipt.business.tin}</p>}
    </header>
    <div className="my-3 space-y-0.5"><Rule /><div className="flex justify-between gap-2 pt-2"><span>{t("receipt.number")}</span><span>{receipt.sale.receipt_number}</span></div><div className="flex justify-between gap-2"><span>{t("sales.date")}</span><span>{formatReceiptDate(receipt.sale.created_at_utc, locale)}</span></div>{settings.show_cashier_name && <div className="flex justify-between gap-2"><span>{t("sales.cashier")}</span><span>{receipt.cashier.display_name}</span></div>}{settings.show_customer_name && receipt.customer && <><div className="flex justify-between gap-2"><span>{t("pos.customer")}</span><span>{receipt.customer.name}</span></div>{receipt.customer.phone && <div className="flex justify-between gap-2"><span>{t("sales.phone")}</span><span>{receipt.customer.phone}</span></div>}</>}{receipt.sale.reversal_status === "reversed" && <p className="pt-1 font-semibold text-destructive">{t("receipt.cancelledReversed")}{receipt.sale.cancellation_reason ? `: ${receipt.sale.cancellation_reason}` : ""}</p>}</div>
    <Rule /><div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-[10px] uppercase"><span>{t("receipt.item")}</span><span>{t("receipt.amount")}</span></div><div className="mt-1 space-y-2">{shownLines.map((line) => <div key={line.sale_item_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2"><div className="min-w-0"><p className="break-words">{line.name}</p><p className="text-black/70">{formatReceiptQuantity(line.quantity_milli)}{line.stock_unit ? ` ${line.stock_unit}` : ""} × {formatReceiptMoney(line.unit_price_ugx, currency, locale)}</p>{line.entered_unit && line.entered_quantity_milli != null && line.entered_unit !== line.stock_unit && <p className="text-black/70">Sold: {formatReceiptQuantity(line.entered_quantity_milli)} {line.entered_unit}</p>}</div><span className="self-end text-right tabular-nums">{formatReceiptMoney(line.line_total_ugx, currency, locale)}</span></div>)}{hiddenCount > 0 && <div className="border-t border-dashed border-black/30 pt-2 text-center text-[10px] text-black/70">+ {hiddenCount} more line items · Expand preview to see all</div>}</div>
    <div className="my-3"><Rule /></div><div className="space-y-0.5 tabular-nums"><div className="flex justify-between"><span>{t("receipt.subtotal")}</span><span>{formatReceiptMoney(receipt.totals.subtotal_ugx, currency, locale)}</span></div>{receipt.totals.discount_total_ugx !== 0 && <div className="flex justify-between"><span>{t("receipt.discount")}</span><span>-{formatReceiptMoney(receipt.totals.discount_total_ugx, currency, locale)}</span></div>}{receipt.totals.tax_total_ugx !== 0 && <div className="flex justify-between"><span>{t("receipt.tax")}</span><span>{formatReceiptMoney(receipt.totals.tax_total_ugx, currency, locale)}</span></div>}<div className="mt-1 flex justify-between border-t border-black pt-1 font-bold text-xs"><span>{t("receipt.total")}</span><span>{formatReceiptMoney(receipt.totals.grand_total_ugx, currency, locale)}</span></div>{settings.show_payment_method && receipt.payments.map((payment, index) => <div key={`${payment.payment_method}-${index}`} className="flex justify-between gap-2"><span>{t("receipt.paid")} · {methodLabel(payment.payment_method)}{payment.reference ? ` (${payment.reference})` : ""}</span><span>{formatReceiptMoney(payment.amount_ugx, currency, locale)}</span></div>)}{settings.show_payment_method && receipt.totals.change_ugx !== 0 && <div className="flex justify-between"><span>{t("pos.change")}</span><span>{formatReceiptMoney(receipt.totals.change_ugx, currency, locale)}</span></div>}{settings.show_payment_method && receipt.totals.balance_due_ugx !== 0 && <div className="flex justify-between"><span>{t("receipt.balance")}</span><span>{formatReceiptMoney(receipt.totals.balance_due_ugx, currency, locale)}</span></div>}</div>
    {(footer?.trim() || settings.show_thank_you_note) && <div className="mt-3 pt-3 text-center"><Rule /><div className="pt-3 break-words whitespace-pre-wrap">{footer?.trim()}</div>{settings.show_thank_you_note && <p className="mt-2 font-sans font-medium">{t("receipt.thankYou")}</p>}</div>}
  </DocumentTemplatePreview>;
}
