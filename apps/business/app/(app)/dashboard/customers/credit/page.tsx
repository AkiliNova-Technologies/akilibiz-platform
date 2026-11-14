import Link from "next/link";
import { Banknote, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerCreditManagementPage() {
  return <main className="flex flex-1 flex-col gap-5">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">Customer Credit</h1>
      <p className="text-sm text-muted-foreground">
        Review outstanding customer balances and record repayments when credit accounting is available on AkiliBiz Web.
      </p>
    </div>
    <Card>
      <CardContent className="flex flex-col items-start gap-4 py-8">
        <ShieldAlert className="size-7 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Credit balances are not yet available on the web</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            AkiliBiz has not connected an authoritative customer credit ledger or repayment
            posting service to this screen. No balance or overdue amount is displayed because
            it cannot currently be verified. To review customer credit or record payments,
            use your desktop application. Your existing desktop records have not changed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/customers">
            <Users className="size-4" /> View customers
          </Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/finance">
            <Banknote className="size-4" /> Financial overview
          </Link></Button>
        </div>
      </CardContent>
    </Card>
  </main>;
}
