import type { ReceiptSettingsFormData } from "@/components/akilibiz/settings/receipt-settings-data";

const money = (amount: number) =>
  new Intl.NumberFormat("en-UG", {
    currency: "UGX",
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

export function ReceiptSettingsPreview({
  settings,
}: {
  settings: ReceiptSettingsFormData;
}) {
  const isDocument = settings.print_profile === "document-a4";
  const header = settings.business_header.trim() || "Your business (preview)";

  return (
    <section aria-labelledby="receipt-live-preview-title" className="space-y-3">
      <div>
        <h2 id="receipt-live-preview-title" className="text-lg font-semibold">
          Live receipt preview
        </h2>
        <p className="text-sm text-muted-foreground">
          Example content only. Changes appear here before you save.
        </p>
      </div>
      <div className="flex min-h-[34rem] justify-center overflow-auto bg-muted/30 p-4 sm:p-6">
        <article
          className={
            isDocument
              ? "w-full max-w-3xl bg-white p-8 font-sans text-sm leading-relaxed text-black shadow-sm"
              : "w-[min(100%,302px)] shrink-0 bg-white p-4 font-mono text-[11px] leading-relaxed text-black shadow-sm sm:p-5"
          }
          data-print-profile={settings.print_profile}
        >
          <header className="text-center">
            {settings.show_logo ? (
              <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-sm bg-slate-200 text-[9px] text-slate-600">
                LOGO
              </div>
            ) : null}
            <p className="break-words font-sans text-sm font-bold uppercase leading-snug">
              {header}
            </p>
            <p className="text-[10px] text-black/70">RECEIPT</p>
            <p>Plot 10, Kampala, Uganda</p>
            <p>Tel: +256 700 000 000</p>
            {settings.show_tin ? <p>TIN: 1000000000</p> : null}
          </header>
          <div className="my-3 space-y-0.5 border-y border-dashed border-black/60 py-2">
            <div className="flex justify-between gap-2"><span>Receipt</span><span>RCPT-000142</span></div>
            <div className="flex justify-between gap-2"><span>Date</span><span>08 Sep 2026</span></div>
            {settings.show_cashier_name ? <div className="flex justify-between gap-2"><span>Cashier</span><span>Amina K.</span></div> : null}
            {settings.show_customer_name ? <div className="flex justify-between gap-2"><span>Customer</span><span>Walk-in</span></div> : null}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-[10px] uppercase"><span>Item</span><span>Amount</span></div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2"><div><p>Arabica coffee, 250 g</p><p className="text-black/70">2 × {money(18000)}</p></div><span>{money(36000)}</span></div>
          <div className="my-3 space-y-0.5 border-t border-black pt-2 tabular-nums"><div className="flex justify-between"><span>Subtotal</span><span>{money(36000)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(7650)}</span></div><div className="mt-1 flex justify-between border-t border-black pt-1 font-bold text-xs"><span>TOTAL</span><span>{money(41150)}</span></div>{settings.show_payment_method ? <div className="flex justify-between"><span>Paid · Cash</span><span>{money(60000)}</span></div> : null}</div>
          {settings.footer_message.trim() || settings.show_thank_you_note ? <footer className="mt-3 border-t border-dashed border-black/60 pt-3 text-center"><p className="whitespace-pre-wrap break-words">{settings.footer_message.trim()}</p>{settings.show_thank_you_note ? <p className="mt-2 font-sans font-medium">Thank you for your purchase!</p> : null}</footer> : null}
        </article>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Previewing one receipt · {Math.max(1, settings.copies_per_print)} {settings.copies_per_print === 1 ? "copy" : "copies"} will print per sale
      </p>
    </section>
  );
}
