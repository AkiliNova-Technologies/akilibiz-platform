import Link from "next/link";
import { ArrowRight, CircleAlert, ClipboardList, Package, Users } from "lucide-react";
import { ProductPageHeader } from "@/components/akilibiz/product-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NavigationGroup, NavigationItem } from "@/lib/desktop-navigation";

const availableDestinations = [
  { href: "/dashboard", label: "Business overview", icon: ClipboardList },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/products", label: "Products", icon: Package },
];

export function DesktopModulePage({ group, item }: {
  group: NavigationGroup;
  item: NavigationItem;
}) {
  return (
    <div className="space-y-5">
      <ProductPageHeader
        eyebrow={group.label}
        title={item.label}
        description="This desktop feature is not connected to a complete web workflow yet."
      />
      <Card>
        <CardContent className="space-y-5 py-8">
          <div className="flex items-start gap-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Not yet available on the web</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {item.label} is part of the AkiliBiz desktop feature set. This web screen has not
                yet been connected to the required hosted business records and actions. No data
                has been loaded, and the absence of records here does not mean your business
                has no activity.
              </p>
              <p className="text-sm text-muted-foreground">
                Continue using AkiliBiz Desktop for this operation until its web implementation is verified.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableDestinations.map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="outline" size="sm">
                <Link href={href}>
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
