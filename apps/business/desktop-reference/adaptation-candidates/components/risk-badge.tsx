import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface RiskBadgeProps {
  level: string;
  score?: number;
  className?: string;
}

export function RiskBadge({ level, score, className }: RiskBadgeProps) {
  const getBadgeStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(getBadgeStyles(level), className)}
    >
      {score !== undefined && (
        <span className="font-semibold mr-1">{score.toFixed(0)}</span>
      )}
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  );
}