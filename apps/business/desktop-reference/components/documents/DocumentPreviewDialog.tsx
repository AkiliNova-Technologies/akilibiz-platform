import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { IconDownload, IconPrinter } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tauriDocumentsService } from "@/services/tauri/documents";
import type { BusinessDocument } from "@/types/documents";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
const base64ToBytes = (encoded: string) =>
  Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));

// Small reusable "label: ______ value" underline row, mirrors the template's
// hand-fillable field style (Date:, Name:, Phone #:, etc).
function UnderlineField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-black/70">{label}</span>
      <span className="flex-1 truncate border-b border-black/40 pb-0.5">
        {value || "\u00A0"}
      </span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-black">
      {children}
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-center justify-between bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide"
          : "flex items-center justify-between border-b border-black/10 px-3 py-2 text-xs"
      }
    >
      <span className={emphasis ? "" : "uppercase tracking-wide text-black/70"}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: BusinessDocument | null;
  open: boolean;
  onOpenChange(value: boolean): void;
}) {
  if (!document) return null;
  const { data } = document;
  const print = async () => {
    try {
      await tauriDocumentsService.printDocument(document.id);
      window.print();
    } catch {
      toast.error(
        "The print request could not be recorded. Your sale remains completed.",
      );
    }
  };
  const savePdf = async () => {
    try {
      const pdf = await tauriDocumentsService.generatePdf(document.id);
      const path = await save({
        defaultPath: pdf.filename,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (path) {
        await writeFile(path, base64ToBytes(pdf.pdf_base64));
        toast.success("PDF saved");
      }
    } catch {
      toast.error("Unable to generate the PDF. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print Preview</DialogTitle>
          <DialogDescription>
            {document.document_number} • immutable transaction snapshot
          </DialogDescription>
        </DialogHeader>

        <article className="mx-auto w-full bg-white p-10 text-sm text-black shadow-sm">
          {/* Header: business info left, big document type right */}
          <header className="flex items-start justify-between border-b border-black pb-4">
            <div className="space-y-0.5 text-xs leading-relaxed text-black/80">
              <p className="text-sm font-semibold text-black">
                {data.business.name}
              </p>
              {data.business.address && <p>{data.business.address}</p>}
              {data.business.phone && <p>Tel: {data.business.phone}</p>}
              {data.business.tin && <p>TIN: {data.business.tin}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-light uppercase tracking-[0.25em]">
                {data.document_type}
              </h2>
              <p className="mt-1 text-xs text-black/60">
                {data.document_number}
              </p>
            </div>
          </header>

          {/* Date / cashier fields */}
          <div className="mt-4 space-y-2 text-xs">
            <UnderlineField
              label="Date:"
              value={new Date(data.date).toLocaleString()}
            />
            <UnderlineField label="Cashier:" value={data.cashier} />
          </div>

          {/* Customer details */}
          {data.customer && (
            <section className="mt-6">
              <SectionHeader>Customer Details</SectionHeader>
              <div className="mt-3 space-y-2 text-xs">
                <UnderlineField label="Name:" value={data.customer.name} />
                {data.customer.phone && (
                  <UnderlineField label="Phone:" value={data.customer.phone} />
                )}
              </div>
            </section>
          )}

          {/* Items table */}
          <section className="mt-6">
            <SectionHeader>Items</SectionHeader>
            <table className="mt-3 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 text-left font-semibold uppercase tracking-wide">
                    Description
                  </th>
                  <th className="py-2 text-right font-semibold uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="py-2 text-right font-semibold uppercase tracking-wide">
                    Price
                  </th>
                  <th className="py-2 text-right font-semibold uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr
                    key={`${item.sku}-${index}`}
                    className="border-b border-black/10"
                  >
                    <td className="py-2 pr-2">
                      <div>{item.name}</div>
                      {item.discount ? (
                        <div className="text-[10px] text-black/50">
                          Discount {money(item.discount, data.currency)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 text-right align-top">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right align-top">
                      {money(item.unit_price, data.currency)}
                    </td>
                    <td className="py-2 text-right align-top font-medium">
                      {money(item.total, data.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Notes + totals */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <SectionHeader>Notes</SectionHeader>
              <div className="mt-3 min-h-[110px] rounded-sm border border-black/10 p-3 text-xs text-black/70">
                {data.footer || "\u00A0"}
              </div>
            </div>

            <div className="flex flex-col self-end border border-black/10">
              <TotalRow
                label="Subtotal"
                value={money(data.totals.subtotal, data.currency)}
              />
              {data.totals.discount > 0 && (
                <TotalRow
                  label="Discount"
                  value={`-${money(data.totals.discount, data.currency)}`}
                />
              )}
              <TotalRow
                label="Tax"
                value={money(data.totals.tax, data.currency)}
              />
              <TotalRow
                label="Total"
                value={money(data.totals.grand_total, data.currency)}
                emphasis
              />
              <TotalRow
                label="Paid"
                value={money(data.totals.amount_paid, data.currency)}
              />
              {data.totals.change > 0 && (
                <TotalRow
                  label="Change"
                  value={money(data.totals.change, data.currency)}
                />
              )}
              {data.totals.balance > 0 && (
                <TotalRow
                  label="Balance"
                  value={money(data.totals.balance, data.currency)}
                />
              )}
            </div>
          </div>

          {/* Sign-off */}
          <footer className="mt-10 text-center">
            <p
              className="text-2xl italic"
              style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
            >
              Thank you!
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-black/50">
              Payment: {data.payment.method}
            </p>
          </footer>
        </article>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => void savePdf()}>
            <IconDownload className="mr-2 size-4" />
            Save PDF
          </Button>
          <Button onClick={() => void print()}>
            <IconPrinter className="mr-2 size-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}