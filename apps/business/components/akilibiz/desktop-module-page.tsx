import { CircleDashed, DatabaseZap } from "lucide-react";

import { ProductPageHeader } from "@/components/akilibiz/product-page-header";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NavigationGroup, NavigationItem } from "@/lib/desktop-navigation";

export function DesktopModulePage({
  group,
  item,
}: {
  group: NavigationGroup;
  item: NavigationItem;
}) {
  return (
    <div className="space-y-5">
      <ProductPageHeader
        actions={<Badge variant="secondary">Web data unavailable</Badge>}
        description={`The ${item.label.toLowerCase()} workspace follows the preserved Desktop ${item.reference} layout.`}
        eyebrow={group.label}
        title={item.label}
      />
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <CircleDashed aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardDescription className="mt-1">
                This Desktop module has been preserved for page-by-page
                adaptation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-6">
          <StatusBanner
            title="This workspace is not connected to web data yet"
            tone="info"
          >
            No records, amounts, permissions, or activity have been fabricated.
            The web data contract will be connected before this module becomes
            operational.
          </StatusBanner>
          <div
            className="grid gap-3 sm:grid-cols-3"
            aria-label="Unavailable module layout"
          >
            {["Filters", "Workspace", "Activity"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-dashed border-border bg-muted/30 p-4"
              >
                <DatabaseZap
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {label}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Available when the browser-safe data boundary is implemented.
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
