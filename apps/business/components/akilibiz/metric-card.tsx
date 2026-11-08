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
      className="group cursor-pointer border transition-all duration-200 ease-in-out hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:border-primary/40 dark:hover:bg-muted/20 dark:focus-visible:ring-offset-background"
      tabIndex={0}
      role="button"
      aria-label={`${title}: ${value}${description ? `, ${description}` : ""}`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80">
            {title}
          </CardTitle>
          <div className="text-2xl font-semibold tracking-tight transition-transform duration-200 group-hover:scale-[1.02]">
            {value}
          </div>
        </div>
        <div className="rounded-xl border bg-muted/40 p-2 text-foreground/70 transition-all duration-200 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm dark:group-hover:border-primary/40 dark:group-hover:bg-primary/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {description && (
          <p className="text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
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
