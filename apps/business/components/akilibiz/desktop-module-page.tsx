import { CircleDashed } from "lucide-react";
import { ProductPageHeader } from "@/components/akilibiz/product-page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { NavigationGroup, NavigationItem } from "@/lib/desktop-navigation";

export function DesktopModulePage({ group, item }: {
  group: NavigationGroup;
  item: NavigationItem;
}) {
  return (
    <div className="space-y-5">
      <ProductPageHeader eyebrow={group.label} title={item.label} />
      <Card>
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 py-8 text-center">
          <CircleDashed aria-hidden="true" className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No records available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
