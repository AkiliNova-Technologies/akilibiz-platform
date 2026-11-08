import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";
import { useReduxCreditRisk } from "../hooks/useReduxCreditRisk";
import { RiskBadge } from "./risk-badge";

interface CreditRiskPanelProps {
  customerId: number;
  customerName: string;
}

export function CreditRiskPanel({
  customerId,
  customerName,
}: CreditRiskPanelProps) {
  const {
    scores,
    getCustomerRisk,
    loading,
    error,
    getCachedRiskScore,
  } = useReduxCreditRisk();

  useEffect(() => {
    const cachedScore = getCachedRiskScore(customerId);
    if (!cachedScore) {
      getCustomerRisk(customerId);
    }
  }, [customerId, getCustomerRisk, getCachedRiskScore]);

  const riskScore = scores[customerId];

  if (loading && !riskScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!riskScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No credit history available for {customerName}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Credit Risk Assessment</span>
          <RiskBadge level={riskScore.level} score={riskScore.score} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risk Score</span>
            <span className="font-medium">{riskScore.score.toFixed(1)}/100</span>
          </div>
          <Progress
            value={riskScore.score}
            className={
              riskScore.score < 30
                ? "bg-green-100"
                : riskScore.score < 60
                ? "bg-yellow-100"
                : "bg-red-100"
            }
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Credit Utilization</p>
            <p className="text-sm font-medium">
              {(riskScore.metrics.credit_utilization * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Ratio</p>
            <p className="text-sm font-medium">
              {(riskScore.metrics.payment_ratio * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Days to Pay</p>
            <p className="text-sm font-medium">
              {riskScore.metrics.avg_days_to_pay.toFixed(0)} days
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overdue Events</p>
            <p className="text-sm font-medium">
              {riskScore.metrics.overdue_count}
            </p>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Risk Factors</h4>
          {riskScore.factors.map((factor) => (
            <div key={factor.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {factor.name
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </span>
                <span className="font-medium">
                  {factor.score.toFixed(0)}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {factor.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}