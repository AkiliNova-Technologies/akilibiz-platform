import Link from "next/link";
import {
  ArchiveRestore,
  ArrowRight,
  Building2,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { SettingsOverviewItem } from "@/components/akilibiz/settings/settings-overview-data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const categoryIcons: Record<SettingsOverviewItem["category"], LucideIcon> = {
  Backup: ArchiveRestore,
  Business: Building2,
  Receipt: ReceiptText,
  Tax: ShieldCheck,
};

function statusVariant(status: SettingsOverviewItem["status"]) {
  if (status === "Configured") return "default";
  if (status === "Needs Review") return "secondary";
  return "destructive";
}

export function SettingsNavigation({
  settings,
}: {
  settings: SettingsOverviewItem[];
}) {
  return (
    <section
      className="grid gap-4 md:grid-cols-2"
      aria-label="Settings categories"
    >
      {settings.map((setting) => {
        const Icon = categoryIcons[setting.category];
        return (
          <Link key={setting.id} href={setting.href} className="group">
            <Card className="h-full transition-colors group-hover:border-sidebar-ring">
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{setting.label}</CardTitle>
                  <CardDescription className="mt-1 leading-5">
                    {setting.summary}
                  </CardDescription>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </CardHeader>
              <CardContent>
                <Badge variant={statusVariant(setting.status)}>
                  {setting.status}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}
