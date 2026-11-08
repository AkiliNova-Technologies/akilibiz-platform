"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type Receipt = {
  saleNumber: string;
  createdAt: string;
  lines: Array<{ name: string; quantity: number; amount: number }>;
  total: number;
};

/** Browser receipt boundary. A receipt becomes printable only when rendered data is supplied. */
export function SalePrintPreviewDialog({
  saleId,
  open,
  onOpenChange,
  context: _context,
}: {
  saleId: number | null;
  open: boolean;
  onOpenChange(v: boolean): void;
  context?: { mode: string };
}) {
  const [receipt] = useState<Receipt | null>(null);
  const [printing, setPrinting] = useState(false);
  const [profile, setProfile] = useState("thermal-80mm");
  const print = () => {
    if (!receipt) return;
    setPrinting(true);
    window.print();
    setPrinting(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Receipt preview</DialogTitle>
          <DialogDescription>
            {receipt
              ? `${receipt.saleNumber} · ${profile === "thermal-58mm" ? "Thermal 58 mm" : "Thermal 80 mm"}`
              : "Receipt data is unavailable."}
          </DialogDescription>
        </DialogHeader>
        {receipt ? (
          <>
            <div className="flex justify-center overflow-auto bg-muted/30 p-4 sm:p-6">
              <div
                data-testid="sale-receipt-paper"
                className="w-full max-w-sm shrink-0 bg-white p-4 font-mono text-[11px] leading-relaxed text-black"
              >
                <p className="text-center font-bold uppercase">AkiliBiz</p>
                <p className="text-center">RECEIPT</p>
                <p>{receipt.createdAt}</p>
                <hr className="my-3 border-dashed" />
                {receipt.lines.map((line) => (
                  <div key={line.name} className="flex justify-between gap-2">
                    <span>
                      {line.name} × {line.quantity}
                    </span>
                    <span>UGX {line.amount.toLocaleString()}</span>
                  </div>
                ))}
                <hr className="my-3" />
                <p className="flex justify-between font-bold">
                  <span>TOTAL</span>
                  <span>UGX {receipt.total.toLocaleString()}</span>
                </p>
                <p className="mt-4 text-center">Thank you for your purchase!</p>
              </div>
            </div>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger
                aria-label="Temporary print format"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal-80mm">Thermal 80 mm</SelectItem>
                <SelectItem value="thermal-58mm">Thermal 58 mm</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button disabled={printing} onClick={print}>
                <Printer className="size-4" />
                {printing ? "Preparing receipt…" : "Print"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-8 text-center text-sm text-muted-foreground">
              Receipt data is unavailable. Printing is available after a receipt
              is generated.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button disabled>
                <Printer className="size-4" />
                Print unavailable
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
