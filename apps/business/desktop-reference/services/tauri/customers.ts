import { invoke } from "@tauri-apps/api/core";

export type CustomerStatus = "Active" | "Inactive";
export type LoyaltyTier = "Standard" | "Silver" | "Gold" | "Platinum";
export type CreditStatus = "Current" | "Due Soon" | "Overdue" | "Critical";
export type RiskLevel = "Low" | "Medium" | "High";
export type PurchasePaymentMethod = "cash" | "card" | "mobile_money" | "split";
export type PurchaseStatus = "completed" | "refunded" | "cancelled";

export interface CustomerQuery {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  customer_type?: string;
  has_credit?: boolean;
}

export interface CreateCustomerPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type?: string | null;
  credit_limit?: number | null;
  opening_balance?: number | null;
  is_active?: boolean;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type?: string | null;
  credit_limit?: number | null;
  opening_balance?: number | null;
  is_active?: boolean;
}

export interface AddLoyaltyPointsPayload {
  points: number;
}

export interface CustomerResponse {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type: string;
  credit_limit: number;
  opening_balance: number;
  outstanding_balance: number;
  total_purchases: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  last_visit?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreditRow {
  id: number;
  customer_name: string;
  phone: string;
  credit_limit: number;
  outstanding_balance: number;
  overdue_amount: number;
  last_payment_date?: string | null;
  due_date?: string | null;
  days_overdue: number;
  risk_level: RiskLevel;
  status: CreditStatus;
}

export interface CustomerPurchaseHistoryRow {
  sale_id: number;
  customer_name: string;
  phone: string;
  invoice_number: string;
  purchase_date: string;
  items_count: number;
  total_amount: number;
  payment_method: PurchasePaymentMethod;
  cashier: string;
  status: PurchaseStatus;
}

export interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  loyalty_customers: number;
  credit_customers: number;
  total_credit_outstanding: number;
  average_customer_value: number;
}

function normalizeQuery(query: CustomerQuery = {}): CustomerQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    is_active: query.is_active,
    customer_type: query.customer_type?.trim() || undefined,
    has_credit: query.has_credit,
  };
}

export const tauriCustomersService = {
  async getCustomers(query: CustomerQuery = {}): Promise<CustomerResponse[]> {
    return await invoke<CustomerResponse[]>("get_customers", {
      params: normalizeQuery(query),
    });
  },

  async getCustomer(customerId: number): Promise<CustomerResponse> {
    return await invoke<CustomerResponse>("get_customer", { customerId });
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<CustomerResponse> {
    return await invoke<CustomerResponse>("create_customer", { payload });
  },

  async updateCustomer(
    customerId: number,
    payload: UpdateCustomerPayload,
  ): Promise<CustomerResponse> {
    return await invoke<CustomerResponse>("update_customer", {
      customerId,
      payload,
    });
  },

  async deactivateCustomer(customerId: number): Promise<CustomerResponse> {
    return await invoke<CustomerResponse>("deactivate_customer", {
      customerId,
    });
  },

  async addLoyaltyPoints(
    customerId: number,
    payload: AddLoyaltyPointsPayload,
  ): Promise<CustomerResponse> {
    return await invoke<CustomerResponse>("add_customer_loyalty_points", {
      customerId,
      payload,
    });
  },

  async getCustomerPurchaseHistory(
    customerId: number,
  ): Promise<CustomerPurchaseHistoryRow[]> {
    return await invoke<CustomerPurchaseHistoryRow[]>(
      "get_customer_purchase_history",
      { customerId },
    );
  },

  async getCustomerCreditAccounts(): Promise<CustomerCreditRow[]> {
    return await invoke<CustomerCreditRow[]>("get_customer_credit_accounts");
  },

  async getCustomerSummary(): Promise<CustomerSummary> {
    return await invoke<CustomerSummary>("get_customer_summary");
  },
};