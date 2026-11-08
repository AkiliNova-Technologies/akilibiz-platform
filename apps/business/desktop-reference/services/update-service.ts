import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

export type UpdaterPhase = "idle" | "checking" | "up_to_date" | "update_available" | "downloading" | "installing" | "restart_required" | "completed" | "error";
export type UpdateProgress = { downloadedBytes: number; contentLength?: number };
export type UpdaterState = { phase: UpdaterPhase; version?: string; progress: UpdateProgress; error?: string };

export const initialUpdaterState: UpdaterState = { phase: "idle", progress: { downloadedBytes: 0 } };

export function progressFromDownloadEvent(progress: UpdateProgress, event: DownloadEvent): UpdateProgress {
  if (event.event === "Started") return { downloadedBytes: 0, contentLength: event.data.contentLength };
  if (event.event === "Progress") return { ...progress, downloadedBytes: progress.downloadedBytes + event.data.chunkLength };
  return progress;
}

export function progressPercentage(progress: UpdateProgress): number | undefined {
  const { contentLength, downloadedBytes } = progress;
  return !contentLength || contentLength <= 0 ? undefined : Math.min(100, Math.round((downloadedBytes / contentLength) * 100));
}

export function formatUpdateBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isWindowsPlatform(): boolean {
  return typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);
}

export function publicUpdateError(error: unknown): string {
  return error instanceof Error && /signature|verification|integrity/i.test(error.message)
    ? "The update could not be verified and was not installed."
    : "The update could not be completed. Please try again later.";
}

export type AvailableUpdate = Pick<Update, "version" | "download" | "install">;
