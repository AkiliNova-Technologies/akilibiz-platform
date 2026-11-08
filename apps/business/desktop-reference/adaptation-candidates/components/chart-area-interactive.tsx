"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

// ============================================================================
// TYPES
// ============================================================================

interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

type TimeRange = "7d" | "30d" | "90d";

interface ChartAreaInteractiveProps {
  /** Title of the chart */
  title?: string;
  
  /** Description of the chart */
  description?: string;
  
  /** The data array to display in the chart */
  data?: ChartDataPoint[];
  
  /** Configuration for chart lines/areas */
  lines?: Array<{
    key: string;
    label: string;
    color?: string;
    fillOpacity?: number;
    strokeWidth?: number;
  }>;
  
  /** Date field in the data objects */
  dateField?: string;
  
  /** Default time range */
  defaultTimeRange?: TimeRange;
  
  /** Whether to show the time range selector */
  showTimeRangeSelector?: boolean;
  
  /** Whether the chart is loading */
  loading?: boolean;
  
  /** Loading message */
  loadingMessage?: string;
  
  /** Empty message when no data */
  emptyMessage?: string;
}

// Default configuration for chart lines
const defaultLines = [
  { key: "revenue", label: "Revenue", color: "var(--primary)" },
  { key: "sales", label: "Sales", color: "var(--primary)" },
]

// Default chart configuration
const getChartConfig = (lines: Array<{ key: string; label: string; color?: string }>) => {
  const config: ChartConfig = {};
  lines.forEach(line => {
    config[line.key] = {
      label: line.label,
      color: line.color || "var(--primary)",
    };
  });
  return config;
};

// Default sample data for demonstration
const defaultChartData = [
  { date: "2024-04-01", revenue: 222, sales: 150 },
  { date: "2024-04-02", revenue: 97, sales: 180 },
  { date: "2024-04-03", revenue: 167, sales: 120 },
  { date: "2024-04-04", revenue: 242, sales: 260 },
  { date: "2024-04-05", revenue: 373, sales: 290 },
  { date: "2024-04-06", revenue: 301, sales: 340 },
  { date: "2024-04-07", revenue: 245, sales: 180 },
  { date: "2024-04-08", revenue: 409, sales: 320 },
  { date: "2024-04-09", revenue: 59, sales: 110 },
  { date: "2024-04-10", revenue: 261, sales: 190 },
  { date: "2024-04-11", revenue: 327, sales: 350 },
  { date: "2024-04-12", revenue: 292, sales: 210 },
  { date: "2024-04-13", revenue: 342, sales: 380 },
  { date: "2024-04-14", revenue: 137, sales: 220 },
  { date: "2024-04-15", revenue: 120, sales: 170 },
  { date: "2024-04-16", revenue: 138, sales: 190 },
  { date: "2024-04-17", revenue: 446, sales: 360 },
  { date: "2024-04-18", revenue: 364, sales: 410 },
  { date: "2024-04-19", revenue: 243, sales: 180 },
  { date: "2024-04-20", revenue: 89, sales: 150 },
  { date: "2024-04-21", revenue: 137, sales: 200 },
  { date: "2024-04-22", revenue: 224, sales: 170 },
  { date: "2024-04-23", revenue: 138, sales: 230 },
  { date: "2024-04-24", revenue: 387, sales: 290 },
  { date: "2024-04-25", revenue: 215, sales: 250 },
  { date: "2024-04-26", revenue: 75, sales: 130 },
  { date: "2024-04-27", revenue: 383, sales: 420 },
  { date: "2024-04-28", revenue: 122, sales: 180 },
  { date: "2024-04-29", revenue: 315, sales: 240 },
  { date: "2024-04-30", revenue: 454, sales: 380 },
  { date: "2024-05-01", revenue: 165, sales: 220 },
  { date: "2024-05-02", revenue: 293, sales: 310 },
  { date: "2024-05-03", revenue: 247, sales: 190 },
  { date: "2024-05-04", revenue: 385, sales: 420 },
  { date: "2024-05-05", revenue: 481, sales: 390 },
  { date: "2024-05-06", revenue: 498, sales: 520 },
  { date: "2024-05-07", revenue: 388, sales: 300 },
  { date: "2024-05-08", revenue: 149, sales: 210 },
  { date: "2024-05-09", revenue: 227, sales: 180 },
  { date: "2024-05-10", revenue: 293, sales: 330 },
  { date: "2024-05-11", revenue: 335, sales: 270 },
  { date: "2024-05-12", revenue: 197, sales: 240 },
  { date: "2024-05-13", revenue: 197, sales: 160 },
  { date: "2024-05-14", revenue: 448, sales: 490 },
  { date: "2024-05-15", revenue: 473, sales: 380 },
  { date: "2024-05-16", revenue: 338, sales: 400 },
  { date: "2024-05-17", revenue: 499, sales: 420 },
  { date: "2024-05-18", revenue: 315, sales: 350 },
  { date: "2024-05-19", revenue: 235, sales: 180 },
  { date: "2024-05-20", revenue: 177, sales: 230 },
  { date: "2024-05-21", revenue: 82, sales: 140 },
  { date: "2024-05-22", revenue: 81, sales: 120 },
  { date: "2024-05-23", revenue: 252, sales: 290 },
  { date: "2024-05-24", revenue: 294, sales: 220 },
  { date: "2024-05-25", revenue: 201, sales: 250 },
  { date: "2024-05-26", revenue: 213, sales: 170 },
  { date: "2024-05-27", revenue: 420, sales: 460 },
  { date: "2024-05-28", revenue: 233, sales: 190 },
  { date: "2024-05-29", revenue: 78, sales: 130 },
  { date: "2024-05-30", revenue: 340, sales: 280 },
  { date: "2024-05-31", revenue: 178, sales: 230 },
  { date: "2024-06-01", revenue: 178, sales: 200 },
  { date: "2024-06-02", revenue: 470, sales: 410 },
  { date: "2024-06-03", revenue: 103, sales: 160 },
  { date: "2024-06-04", revenue: 439, sales: 380 },
  { date: "2024-06-05", revenue: 88, sales: 140 },
  { date: "2024-06-06", revenue: 294, sales: 250 },
  { date: "2024-06-07", revenue: 323, sales: 370 },
  { date: "2024-06-08", revenue: 385, sales: 320 },
  { date: "2024-06-09", revenue: 438, sales: 480 },
  { date: "2024-06-10", revenue: 155, sales: 200 },
  { date: "2024-06-11", revenue: 92, sales: 150 },
  { date: "2024-06-12", revenue: 492, sales: 420 },
  { date: "2024-06-13", revenue: 81, sales: 130 },
  { date: "2024-06-14", revenue: 426, sales: 380 },
  { date: "2024-06-15", revenue: 307, sales: 350 },
  { date: "2024-06-16", revenue: 371, sales: 310 },
  { date: "2024-06-17", revenue: 475, sales: 520 },
  { date: "2024-06-18", revenue: 107, sales: 170 },
  { date: "2024-06-19", revenue: 341, sales: 290 },
  { date: "2024-06-20", revenue: 408, sales: 450 },
  { date: "2024-06-21", revenue: 169, sales: 210 },
  { date: "2024-06-22", revenue: 317, sales: 270 },
  { date: "2024-06-23", revenue: 480, sales: 530 },
  { date: "2024-06-24", revenue: 132, sales: 180 },
  { date: "2024-06-25", revenue: 141, sales: 190 },
  { date: "2024-06-26", revenue: 434, sales: 380 },
  { date: "2024-06-27", revenue: 448, sales: 490 },
  { date: "2024-06-28", revenue: 149, sales: 200 },
  { date: "2024-06-29", revenue: 103, sales: 160 },
  { date: "2024-06-30", revenue: 446, sales: 400 },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChartAreaInteractive({
  title = "Sales Overview",
  description = "Revenue trends for the last 7 days",
  data = defaultChartData,
  lines = defaultLines,
  dateField = "date",
  defaultTimeRange = "7d",
  showTimeRangeSelector = true,
  loading = false,
  loadingMessage = "Loading chart data...",
  emptyMessage = "No data available",
}: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState<TimeRange>(defaultTimeRange)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by date to get the latest date
    const sortedData = [...data].sort((a, b) => 
      new Date(b[dateField] as string).getTime() - new Date(a[dateField] as string).getTime()
    );
    
    const referenceDate = new Date(sortedData[0][dateField] as string);
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return data.filter((item) => {
      const date = new Date(item[dateField] as string);
      return date >= startDate;
    }).sort((a, b) => 
      new Date(a[dateField] as string).getTime() - new Date(b[dateField] as string).getTime()
    );
  }, [data, dateField, timeRange]);

  // Generate chart configuration
  const chartConfig = React.useMemo(() => 
    getChartConfig(lines), [lines]
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get gradient IDs
  const getGradientId = (key: string) => `fill-${key}`;

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    if (value === "7d" || value === "30d" || value === "90d") {
      setTimeRange(value);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="aspect-auto h-[250px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">{loadingMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="aspect-auto h-[250px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
        {showTimeRangeSelector && (
          <CardAction>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={handleTimeRangeChange}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
            >
              <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
              <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
              <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Last 7 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              {lines.map((line) => (
                <linearGradient
                  key={getGradientId(line.key)}
                  id={getGradientId(line.key)}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${line.key})`}
                    stopOpacity={line.fillOpacity || 0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${line.key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={dateField}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDate}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={formatDate}
                  indicator="dot"
                />
              }
            />
            {lines.map((line) => (
              <Area
                key={line.key}
                dataKey={line.key}
                type="natural"
                fill={`url(#${getGradientId(line.key)})`}
                stroke={`var(--color-${line.key})`}
                strokeWidth={line.strokeWidth || 2}
                stackId="a"
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}