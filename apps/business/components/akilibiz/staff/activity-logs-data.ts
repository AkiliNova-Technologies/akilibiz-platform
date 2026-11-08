"use client";

import { useCallback, useMemo, useState } from "react";
import type { StaffMember } from "@/components/akilibiz/staff/staff-data";

export type ActivityLogStatus = "Success" | "Failed" | "Warning";
export type ActivityLogModule = "Authentication" | "POS" | "Products" | "Inventory" | "Customers" | "Suppliers" | "Finance" | "Reports" | "Settings" | "Staff";
export interface ActivityLog { id: number; user_name: string; role: string; action: string; module: ActivityLogModule; target: string; status: ActivityLogStatus; ip_address: string; created_at: string; details: string; staff?: Pick<StaffMember, "id" | "username" | "role_name">; }

const seed: ActivityLog[] = [{ id: 1, user_name: "Albert Watbin", role: "Business Owner", action: "Recorded a sale", module: "POS", target: "SAL-20260919-001", status: "Success", ip_address: "127.0.0.1", created_at: "2026-09-19T10:30:00Z", details: "Sale recorded for UGX 420,000.", staff: { id: 1, username: "albert", role_name: "Business Owner" } }, { id: 2, user_name: "Grace Namusoke", role: "Cashier", action: "Adjusted stock", module: "Inventory", target: "Arabica coffee", status: "Warning", ip_address: "127.0.0.1", created_at: "2026-09-18T14:15:00Z", details: "Stock adjustment requires review.", staff: { id: 2, username: "grace", role_name: "Cashier" } }, { id: 3, user_name: "Grace Namusoke", role: "Cashier", action: "Sign-in attempt", module: "Authentication", target: "Staff account", status: "Failed", ip_address: "127.0.0.1", created_at: "2026-09-18T08:10:00Z", details: "Sign-in was not completed." }];

export function useActivityLogsData() {
  const [logs] = useState<ActivityLog[]>(seed);
  const summary = useMemo(() => ({ total_logs: logs.length, successful_logs: logs.filter((log) => log.status === "Success").length, failed_logs: logs.filter((log) => log.status === "Failed").length, warning_logs: logs.filter((log) => log.status === "Warning").length }), [logs]);
  const getLogs = useCallback(async () => logs, [logs]); const getSummary = useCallback(async () => summary, [summary]);
  return { logs, summary, loading: false, getLogs, getSummary };
}
