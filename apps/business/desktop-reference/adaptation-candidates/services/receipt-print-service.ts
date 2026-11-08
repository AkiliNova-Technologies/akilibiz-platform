import type {
  ReceiptBusinessProfile,
  ReceiptPresentationSettings,
} from "@/components/documents/ReceiptPresentation";
import { formatReceiptDate, formatReceiptMoney, formatReceiptQuantity } from "@/components/documents/ReceiptPresentation";
import type { CanonicalReceipt, ReceiptPresentationContext } from "@/types/receipt";
import { printProfileFor, profileFromLegacyWidth } from "@/services/receipt-print-profiles";

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const receiptPaperWidth = (width: string) =>
  width.trim() === "58mm" ? "58mm" : "80mm";

const row = (label: string, value: string) =>
  `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;

export function buildReceiptPrintHtml({
  receipt,
  settings,
  businessProfile: _businessProfile,
  context = { mode: "original" },
}: {
  receipt: CanonicalReceipt;
  settings: ReceiptPresentationSettings;
  businessProfile: ReceiptBusinessProfile | null;
  context?: ReceiptPresentationContext;
}): string {
  const profile = printProfileFor(settings.print_profile ?? profileFromLegacyWidth(settings.receipt_width));
  const paperWidth = profile.paper;
  const currency = receipt.sale.currency_code;
  const business = receipt.business;
  const isReprint = context.mode === "reprint" || receipt.presentation.reprint;
  const lines = receipt.lines
    .map(
      (line) => `<div class="line-item"><div><strong>${escapeHtml(line.name)}</strong><br><span>${escapeHtml(formatReceiptQuantity(line.quantity_milli))} × ${escapeHtml(formatReceiptMoney(line.unit_price_ugx, currency))}</span></div><strong>${escapeHtml(formatReceiptMoney(line.line_total_ugx, currency))}</strong></div>`,
    )
    .join("");
  const payments = settings.show_payment_method
    ? receipt.payments.map((payment) => row(`Paid · ${payment.payment_method}${payment.reference ? ` (${payment.reference})` : ""}`, formatReceiptMoney(payment.amount_ugx, currency))).join("")
    : "";
  const totals = [
    row("Subtotal", formatReceiptMoney(receipt.totals.subtotal_ugx, currency)),
    receipt.totals.discount_total_ugx ? row("Discount", `-${formatReceiptMoney(receipt.totals.discount_total_ugx, currency)}`) : "",
    receipt.totals.tax_total_ugx ? row("Tax", formatReceiptMoney(receipt.totals.tax_total_ugx, currency)) : "",
    `<div class="row total"><strong>TOTAL</strong><strong>${escapeHtml(formatReceiptMoney(receipt.totals.grand_total_ugx, currency))}</strong></div>`,
    payments,
    receipt.totals.change_ugx ? row("Change", formatReceiptMoney(receipt.totals.change_ugx, currency)) : "",
    receipt.totals.balance_due_ugx ? row("Balance", formatReceiptMoney(receipt.totals.balance_due_ugx, currency)) : "",
  ].join("");
  const copyCount = Math.max(1, Math.floor(settings.copies_per_print || 1));
  const receiptMarkup = `<main class="receipt ${profile.id === "document-a4" ? "document" : "thermal"}" data-print-profile="${profile.id}">
    <header><strong class="business-name">${escapeHtml(business.name)}</strong><div class="document-label">${isReprint ? "RECEIPT · REPRINT" : "RECEIPT"}</div>${business.address ? `<div>${escapeHtml(business.address)}</div>` : ""}${business.phone ? `<div>Tel: ${escapeHtml(business.phone)}</div>` : ""}${business.email ? `<div>${escapeHtml(business.email)}</div>` : ""}${settings.show_tin && business.tin ? `<div>TIN: ${escapeHtml(business.tin)}</div>` : ""}</header>
    <section class="details">${row("Receipt", receipt.sale.receipt_number)}${row("Date", formatReceiptDate(receipt.sale.created_at_utc))}${settings.show_cashier_name ? row("Cashier", receipt.cashier.display_name) : ""}${settings.show_customer_name && receipt.customer ? row("Customer", receipt.customer.name) : ""}${settings.show_customer_name && receipt.customer?.phone ? row("Phone", receipt.customer.phone) : ""}${receipt.sale.reversal_status === "reversed" ? `<p class="reversal">Cancelled / reversed${receipt.sale.cancellation_reason ? `: ${escapeHtml(receipt.sale.cancellation_reason)}` : ""}</p>` : ""}</section>
    <section class="items"><div class="item-heading"><span>Item</span><span>Amount</span></div>${lines}</section>
    <section class="totals">${totals}</section>
    ${((receipt.presentation.footer ?? settings.footer_message)?.trim() || settings.show_thank_you_note) ? `<footer>${(receipt.presentation.footer ?? settings.footer_message)?.trim() ? `<div>${escapeHtml((receipt.presentation.footer ?? settings.footer_message)!.trim()).replaceAll("\n", "<br>")}</div>` : ""}${settings.show_thank_you_note ? "<p>Thank you for your purchase!</p>" : ""}</footer>` : ""}
  </main>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(receipt.sale.receipt_number)}</title><style>
    * { box-sizing: border-box; } html, body { margin:0; padding:0; background:#fff; color:#000; } body { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:${profile.typography}; line-height:1.35; } .receipt { background:#fff; overflow-wrap:anywhere; } header { text-align:center; } .business-name { display:block; font-family:Arial,sans-serif; font-size:1.2em; text-transform:uppercase; } .document-label { margin:1mm 0; font-size:.9em; } .details,.items,.totals,footer { border-top:1px dashed #000; margin-top:3mm; padding-top:2mm; } .row,.line-item,.item-heading { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2mm; } .row > :last-child,.line-item > :last-child,.item-heading > :last-child { text-align:right; } .line-item { margin-top:2mm; break-inside:avoid; } .total { border-top:1px solid #000; margin-top:2mm; padding-top:1mm; font-size:1.1em; } footer { text-align:center; white-space:pre-wrap; } .receipt + .receipt { break-before:page; } @media print { @page { ${profile.id === "document-a4" ? "size:A4; margin:14mm;" : `size:${paperWidth}; margin:${profile.margin};`} } .thermal { width:${paperWidth}; padding:0; } .document { width:100%; padding:0; font-family:Arial,sans-serif; } }
  </style></head><body>${Array.from({ length: copyCount }, () => receiptMarkup).join("")}</body></html>`;
}

export function createReceiptPrintController(startPrint: (html: string) => Promise<void>) {
  let printing = false;
  return {
    async print(html: string) {
      if (printing) return false;
      printing = true;
      try {
        await startPrint(html);
        return true;
      } finally {
        printing = false;
      }
    },
  };
}

const printCleanupDelayMs = 60_000;

/**
 * Prints from a receipt-only document.  The iframe remains attached until the
 * browser has finished (or cancelled) its native dialog: removing it earlier
 * is what produces empty print jobs in Chromium webviews.
 */
export function printReceiptInFrame(html: string, hostDocument: Document = document): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = hostDocument.createElement("iframe");
    let cleanedUp = false;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (cleanupTimer) clearTimeout(cleanupTimer);
      iframe.remove();
    };

    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText = "position:fixed; width:0; height:0; border:0; visibility:hidden; pointer-events:none;";
    iframe.addEventListener("load", () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        cleanup();
        reject(new Error("Receipt print frame unavailable"));
        return;
      }

      printWindow.addEventListener("afterprint", cleanup, { once: true });
      try {
        printWindow.focus();
        // The timer cannot fire while a blocking native print dialog is open;
        // it is solely a cleanup fallback for webviews that omit afterprint.
        cleanupTimer = setTimeout(cleanup, printCleanupDelayMs);
        printWindow.print();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, { once: true });

    try {
      // srcdoc gives the print window a complete, receipt-only document; the
      // application document is never the target of window.print().
      iframe.srcdoc = html;
      hostDocument.body.appendChild(iframe);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

const receiptPrintController = createReceiptPrintController(printReceiptInFrame);

export function printReceiptDocument(html: string) {
  return receiptPrintController.print(html);
}
