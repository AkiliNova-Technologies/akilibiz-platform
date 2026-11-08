import { invoke } from "@tauri-apps/api/core";

export type ActivityLogStatus = "Success" | "Failed" | "Warning";

export interface ActivityLogQuery {
  skip?: number;
  limit?: number;
  search?: string;
  module?: string;
  status?: ActivityLogStatus | "all";
  user_id?: number;
}

export interface ActivityLogResponse {
  id: number;
  user_name: string;
  role: string;
  action: string;
  module: string;
  target: string;
  status: ActivityLogStatus;
  ip_address?: string | null;
  created_at: string;
  details?: string | null;
}

export interface ActivityLogSummary {
  total_logs: number;
  successful_logs: number;
  failed_logs: number;
  warning_logs: number;
}

function normalizeQuery(query: ActivityLogQuery = {}): ActivityLogQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    module: query.module?.trim() || undefined,
    status: query.status && query.status !== "all" ? query.status : undefined,
    user_id: query.user_id,
  };
}

export const tauriActivityLogsService = {
  async getActivityLogs(
    query: ActivityLogQuery = {},
  ): Promise<ActivityLogResponse[]> {
    return await invoke<ActivityLogResponse[]>("get_activity_logs", {
      params: normalizeQuery(query),
    });
  },

  async getActivityLog(logId: number): Promise<ActivityLogResponse> {
    return await invoke<ActivityLogResponse>("get_activity_log", { logId });
  },

  async getActivityLogSummary(): Promise<ActivityLogSummary> {
    return await invoke<ActivityLogSummary>("get_activity_log_summary");
  },
};