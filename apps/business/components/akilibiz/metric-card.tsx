import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getTrendStyles(isPositive: boolean) {
  return isPositive
    ? "text-emerald-600 dark:text-emerald-500"
    : "text-red-600 dark:text-red-500";
}

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  footer?: React.ReactNode;
}

export default function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  footer,
}: MetricCardProps) {
  return (
    <Card
      className="border shadow-none"

    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-2xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
        <div className="rounded-full border bg-muted/30 p-2 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {trend && (
          <div
            className={`mt-3 flex items-center text-xs font-medium ${getTrendStyles(trend.positive)} transition-transform duration-200 group-hover:translate-x-0.5`}
          >
            {trend.positive ? (
              <TrendingUp className="mr-1 size-3.5" />
            ) : (
              <TrendingDown className="mr-1 size-3.5" />
            )}
            {trend.value}
          </div>
        )}
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}
