import { invoke } from "@tauri-apps/api/core";

export interface RiskScore {
  customer_id: number;
  score: number;
  level: string;
  metrics: RiskMetrics;
  factors: RiskFactor[];
  calculated_at: string;
}

export interface RiskMetrics {
  credit_utilization: number;
  avg_credit_amount: number;
  total_credit_amount: number;
  total_payment_amount: number;
  payment_ratio: number;
  avg_days_to_pay: number;
  overdue_count: number;
  overdue_ratio: number;
  longest_overdue_streak: number;
  customer_tenure_days: number;
  credit_frequency: number;
  recent_credit_activity: number;
  
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface CreditEvent {
  id: number;
  customer_id: number;
  event_type: string;
  amount: number;
  sale_id: number | null;
  balance_after: number;
  due_date: string | null;
  occurred_at: string;
  metadata: string | null;
}

export async function calculateCustomerRisk(
  customerId: number
): Promise<RiskScore> {
  return await invoke("calculate_customer_risk", {
    customerId,
  });
}

export async function getCustomerCreditEvents(
  customerId: number,
  limit?: number,
  offset?: number
): Promise<CreditEvent[]> {
  return await invoke("get_customer_credit_events", {
    customerId,
    limit,
    offset,
  });
}