import { Smartphone } from "lucide-react";
import { requireActiveBusiness } from "@/lib/business-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const providers = [
  { code: "mtn", label: "MTN MoMo" },
  { code: "airtel", label: "Airtel Money" },
] as const;

export default async function MerchantWalletsPage() {
  const business = await requireActiveBusiness();
  return (
    <main className="flex min-w-0 flex-col gap-4 md:gap-6">
      <div className="space-y-1 pt-1">
        <h1 className="text-xl font-semibold sm:text-2xl">Merchant Wallets</h1>
        <p className="text-sm text-muted-foreground">
          Manage the mobile money accounts your business uses to receive payments.
        </p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3" role="status">
        <div className="space-y-1">
          <p className="text-sm font-medium">Wallet management not yet connected</p>
          <p className="text-sm text-muted-foreground">
            The hosted application cannot retrieve or save merchant wallets yet.
            Existing desktop settings are not shown here.
          </p>
        </div>
        <Badge variant="outline">Unavailable</Badge>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.code} className="gap-0 py-0 sm:gap-0 sm:py-0">
            <CardContent className="space-y-4 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{provider.label}</h2>
                  <p className="text-sm text-muted-foreground">Account details unavailable</p>
                </div>
                <Badge variant="secondary">Not connected</Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor={provider.code + "-account-name"}>Account name</Label>
                <Input id={provider.code + "-account-name"} disabled placeholder="Not available" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={provider.code + "-wallet-phone"}>Wallet number</Label>
                <Input id={provider.code + "-wallet-phone"} disabled placeholder="Not available" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={provider.code + "-merchant-code"}>Merchant code (optional)</Label>
                <Input id={provider.code + "-merchant-code"} disabled placeholder="Not available" />
                <p className="text-xs text-muted-foreground">
                  Merchant codes are optional and must be verified with your payment provider.
                </p>
              </div>
              <div className="flex justify-end border-t pt-3">
                <Button type="button" disabled title="Hosted wallet management is not connected">Save wallet</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Active business: {business.name}. Adding wallet details does not activate mobile money collection;
        payment integration requires separate verification.
      </p>
    </main>
  );
}
