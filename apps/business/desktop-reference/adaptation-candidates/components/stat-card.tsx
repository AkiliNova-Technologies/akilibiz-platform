import * as React from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TrendData {
  value: string | number;
  direction: "up" | "down" | "neutral";
  label?: string;
}

export interface StatCardProps {
  // Main content
  title: string;
  value: string | number;
  description?: string;

  // Icon
  icon?: React.ReactNode;
  iconClassName?: string;

  // Trend/Badge
  trend?: TrendData;
  showTrendIcon?: boolean;

  // Footer
  footer?: {
    primary?: string;
    secondary?: string;
    icon?: React.ReactNode;
  };

  // Styling
  className?: string;
  variant?: "default" | "gradient" | "outline";
  
  // Interaction
  onClick?: () => void;
  loading?: boolean;
  
  // Custom content
  customContent?: React.ReactNode;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getTrendIcon = (direction: TrendData["direction"]) => {
  if (direction === "up") return <IconTrendingUp className="size-4" />;
  if (direction === "down") return <IconTrendingDown className="size-4" />;
  return null;
};

const getTrendVariant = (direction: TrendData["direction"]) => {
  if (direction === "up") return "outline";
  if (direction === "down") return "destructive";
  return "secondary";
};

const formatValue = (value: string | number): string => {
  if (typeof value === "number") {
    // Check if it's a currency value (you can customize this)
    if (value >= 1000) {
      return value.toLocaleString();
    }
    return value.toString();
  }
  return value;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatCard({
  // Main content
  title,
  value,
  description,

  // Icon
  icon,
  iconClassName,

  // Trend/Badge
  trend,
  showTrendIcon = true,

  // Footer
  footer,

  // Styling
  className,
  variant = "default",

  // Interaction
  onClick,
  loading = false,

  // Custom content
  customContent,
}: StatCardProps) {
  const cardVariants = {
    default: "",
    gradient: "bg-gradient-to-t from-background to-muted/20",
    outline: "border-2",
  };

  return (
    <Card
      className={cn(
        "@container/card",
        cardVariants[variant],
        onClick && "cursor-pointer hover:shadow-lg transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex flex-row items-center justify-between gap-2">
          {/* Icon */}
          {icon && (
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg bg-primary/10",
                iconClassName
              )}
            >
              {icon}
            </div>
          )}
          
          {/* Description/Title */}
          <CardDescription className="flex-1">{description || title}</CardDescription>
        </div>

        {/* Main Value */}
        <CardTitle
          className={cn(
            "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
            loading && "animate-pulse"
          )}
        >
          {loading ? "Loading..." : formatValue(value)}
        </CardTitle>

        {/* Trend Badge */}
        {trend && (
          <CardAction>
            <Badge variant={getTrendVariant(trend.direction)} >
              {showTrendIcon && getTrendIcon(trend.direction)}
              {trend.value}
              {trend.label && ` ${trend.label}`}
              
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      {/* Footer or Custom Content */}
      {(footer || customContent) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {customContent ? (
            customContent
          ) : footer ? (
            <>
              {footer.primary && (
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {footer.primary}
                  {footer.icon || (trend && getTrendIcon(trend.direction))}
                </div>
              )}
              {footer.secondary && (
                <div className="text-muted-foreground line-clamp-2">
                  {footer.secondary}
                </div>
              )}
            </>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// STAT CARDS GRID WRAPPER
// ============================================================================

export interface StatCardsGridProps {
  cards: StatCardProps[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  variant?: "default" | "gradient" | "outline";
}

export function StatCardsGrid({
  cards,
  columns = 4,
  className,
  variant = "default",
}: StatCardsGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 @xl/main:grid-cols-2",
    3: "grid-cols-1 @xl/main:grid-cols-2 @4xl/main:grid-cols-3",
    4: "grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        gridCols[columns],
        className
      )}
    >
      {cards.map((card, index) => (
        <StatCard
          key={index}
          {...card}
          variant={card.variant || variant}
        />
      ))}
    </div>
  );
}