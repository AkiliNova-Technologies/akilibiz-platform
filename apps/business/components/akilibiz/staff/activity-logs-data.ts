"use client";

import { useCallback, useState } from "react";
import type { StaffMember } from "@/components/akilibiz/staff/staff-data";

export type ActivityLogStatus = "Success" | "Failed" | "Warning";
export type ActivityLogModule = "Authentication" | "POS" | "Products" | "Inventory" | "Customers" | "Suppliers" | "Finance" | "Reports" | "Settings" | "Staff";
export interface ActivityLog { id: number; user_name: string; role: string; action: string; module: ActivityLogModule; target: string; status: ActivityLogStatus; ip_address: string; created_at: string; details: string; staff?: Pick<StaffMember, "id" | "username" | "role_name">; }

const seed: ActivityLog[] = [];

export function useActivityLogsData() {
  const [logs] = useState<ActivityLog[]>(seed);
  const summary: {
    total_logs: number; successful_logs: number; failed_logs: number; warning_logs: number;
  } | null = null;
  const getLogs = useCallback(async () => logs, [logs]); const getSummary = useCallback(async () => summary, [summary]);
  return { logs, summary, loading: false, getLogs, getSummary };
}
