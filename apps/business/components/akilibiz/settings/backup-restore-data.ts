"use client";

import { useCallback, useMemo, useState } from "react";

export type BackupRecord = {
  id: string; name: string; createdAt: string; size: string; status: "Verified";
};

const unavailable = (): never => {
  throw new Error("Backup and restore operations are unavailable until the secure backup service is connected.");
};

export function useBrowserBackupRestore() {
  const [backups] = useState<BackupRecord[]>([]);
  const [loading] = useState<"create" | "verify" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createBackup = useCallback(async (): Promise<never> => unavailable(), []);
  const verifyFile = useCallback(async (_file: File): Promise<boolean> => {
    setError("Backup file verification is not connected.");
    return false;
  }, []);
  const restore = useCallback(async (_file: File): Promise<never> => unavailable(), []);
  const hasBackups = useMemo(() => backups.length > 0, [backups]);
  return { backups, createBackup, error, loading, message, restore, setError, setMessage, verifyFile, hasBackups };
}
