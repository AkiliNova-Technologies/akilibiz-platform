"use client";

import { useCallback } from "react";

export type LoyaltyTier = "Standard" | "Silver" | "Gold" | "Platinum";
export type PurchasePaymentMethod = "cash" | "card" | "mobile_money" | "split";
export type PurchaseStatus = "completed" | "refunded" | "cancelled";
export interface CustomerResponse { id: number; name: string; email?: string | null; phone?: string | null; address?: string | null; customer_type: string; credit_limit: number; opening_balance: number; outstanding_balance: number; total_purchases: number; total_spent: number; loyalty_points: number; loyalty_tier: LoyaltyTier; last_visit?: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface CustomerPurchaseHistoryRow { sale_id: number; customer_name: string; phone: string; invoice_number: string; purchase_date: string; items_count: number; total_amount: number; payment_method: PurchasePaymentMethod; cashier: string; status: PurchaseStatus; }
export interface CustomerSummary { total_customers: number; active_customers: number; new_customers_this_month: number; loyalty_customers: number; credit_customers: number; total_credit_outstanding: number; average_customer_value: number; }
export interface CreateCustomerPayload { name: string; email?: string | null; phone?: string | null; address?: string | null; customer_type?: string | null; credit_limit?: number | null; opening_balance?: number | null; is_active?: boolean; }
export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
export type CreditStatus = "Current" | "Due Soon" | "Overdue" | "Critical";
export type RiskLevel = "Low" | "Medium" | "High";
export interface CustomerCreditRow { id: number; customer_name: string; phone: string; credit_limit: number; outstanding_balance: number; overdue_amount: number; last_payment_date?: string | null; due_date?: string | null; days_overdue: number; risk_level: RiskLevel; status: CreditStatus; }

export const customerTranslations: Record<string, string> = { "customers.title":"Customers", "customers.directory":"Customer Directory", "customers.description":"Manage your customer relationships, loyalty, and credit.", "customers.total":"Total Customers", "customers.newThisMonth":"New This Month", "customers.recentlyAcquired":"Recently acquired customers", "customers.loyaltyMembers":"Loyalty Members", "customers.rewardEngagement":"Reward program engagement", "customers.averageValue":"Average Lifetime Value", "customers.averageValueDescription":"Average amount spent per customer", "customers.credit":"Credit Customers", "customers.outstandingCredit":"Outstanding Credit", "customers.unpaidBalances":"Unpaid customer balances", "customers.directoryDescription":"View and manage customer profiles and purchase activity.", "customers.search":"Search customers...", "customers.import":"Import", "customers.export":"Export", "customers.add":"Add Customer", "customers.addNew":"Add New Customer", "customers.edit":"Edit Customer", "customers.editDescription":"Update this customer profile and account configuration.", "customers.addDescription":"Create a customer profile and configure their account.", "customers.name":"Name", "customers.email":"Email", "customers.phone":"Phone", "customers.address":"Address", "customers.purchases":"Purchases", "customers.totalSpent":"Total Spent", "customers.points":"Points", "customers.tier":"Tier", "customers.creditBalance":"Credit Balance", "customers.lastVisit":"Last Visit", "customers.viewProfile":"View profile", "customers.history":"Purchase History", "customers.profile":"Customer Profile", "customers.profileDescription":"Review contact details, account status, and customer value.", "customers.customerId":"Customer ID", "customers.noEmail":"No email", "customers.noPhone":"No phone", "customers.noAddress":"No address", "customers.creditLimit":"Credit Limit", "customers.openingBalance":"Opening Balance", "customers.outstandingBalance":"Outstanding Balance", "customers.purchaseHistoryDescription":"Review this customer's completed and reversed purchases.", "customers.transactions":"Transactions", "customers.transactionsDescription":"Purchase activity for this customer.", "customers.totalRevenue":"Total Revenue", "customers.totalRevenueDescription":"Completed purchase revenue", "customers.averagePurchaseValue":"Average Purchase Value", "customers.averagePurchaseDescription":"Average completed purchase", "customers.searchPurchases":"Search purchases...", "customers.empty":"No customers found.", "customers.loading":"Loading customers...", "customers.emptyHistory":"No purchase history found.", "customers.loadingHistory":"Loading purchase history...", "customers.purchaseDate":"Purchase Date", "customers.items":"Items", "customers.totalAmount":"Total Amount", "customers.payment":"Payment", "customers.cashier":"Cashier", "customers.viewPurchase":"View purchase", "customers.viewReceipt":"View receipt", "customers.purchaseDetails":"Purchase Details", "customers.purchaseDetailsDescription":"Review the selected purchase.", "customers.customerInformation":"Customer Information", "customers.accountConfiguration":"Account Configuration", "customers.customerType":"Customer Type", "customers.selectCustomerType":"Select customer type", "customers.selectStatus":"Select status", "customers.requiredNote":"Name is required. Contact and credit information can be updated later.", "customers.nameRequired":"Customer name is required", "customers.emailInvalid":"Enter a valid email address", "customers.creditLimitInvalid":"Credit limit must be a number", "customers.openingBalanceInvalid":"Opening balance must be a number", "customers.creditLimitNegative":"Credit limit cannot be negative", "customers.openingBalanceNegative":"Opening balance cannot be negative", "customers.updated":"Customer updated", "customers.added":"Customer added", "customers.saveFailed":"Unable to save customer", "customers.updating":"Updating...", "customers.adding":"Adding...", "common.active":"Active", "common.inactive":"Inactive", "pos.cancel":"Cancel", "pos.customer":"Customer", "sales.status":"Status", "sales.invoice":"Invoice", "sales.paymentMethod":"Payment method" };
Object.assign(customerTranslations, { "customers.saveChanges": "Save Changes" });
export const t = (key: string, values?: Record<string, string | number>) => customerTranslations[key]?.replace(/{{(\w+)}}/g, (_, name) => String(values?.[name] ?? "")) ?? key;
export const formatCurrency = (value: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);

// Compatibility contract only. The operational directory lives in
// HostedDirectoryPage and uses membership-scoped Supabase reads.
const EMPTY_CUSTOMERS: CustomerResponse[] = [];
const EMPTY_PURCHASES: CustomerPurchaseHistoryRow[] = [];
function unavailable(): never {
  throw new Error("Customer changes must be requested through the hosted contact workflow.");
}
export function useCustomersData() {
  const getCustomers=useCallback(async()=>EMPTY_CUSTOMERS,[]);
  const getCustomerSummary=useCallback(async():Promise<CustomerSummary>=>unavailable(),[]);
  const getPurchaseHistory=useCallback(async(_id:number)=>EMPTY_PURCHASES,[]);
  const addCustomer=useCallback(async(_payload:CreateCustomerPayload):Promise<CustomerResponse>=>unavailable(),[]);
  const editCustomer=useCallback(async(_id:number,_payload:UpdateCustomerPayload):Promise<CustomerResponse|null>=>unavailable(),[]);
  return {
    customers:EMPTY_CUSTOMERS,
    summary:null as CustomerSummary|null,
    purchaseHistory:EMPTY_PURCHASES,
    loading:false,
    getCustomers,getCustomerSummary,getPurchaseHistory,addCustomer,editCustomer,
  };
}
