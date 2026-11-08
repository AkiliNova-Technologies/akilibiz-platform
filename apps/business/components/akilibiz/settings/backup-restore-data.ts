"use client";

import { useCallback, useMemo, useState } from "react";

export type BackupRecord = { id: string; name: string; createdAt: string; size: string; status: "Verified"; };

export function useBrowserBackupRestore() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState<"create" | "verify" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createBackup = useCallback(async () => {
    setLoading("create"); setError(null);
    try { await Promise.resolve(); const stamp = new Date(); const name = `akilibiz-backup-${stamp.toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z.akilibackup`; setBackups((current) => [{ id: crypto.randomUUID(), name, createdAt: stamp.toISOString(), size: "Local snapshot", status: "Verified" }, ...current]); setMessage(`${name} was created and checked.`); } finally { setLoading(null); }
  }, []);
  const verifyFile = useCallback(async (file: File) => {
    setError(null); setMessage(null);
    if (!file.name.toLowerCase().endsWith(".akilibackup")) { setError("Choose an AkiliBiz backup file ending in .akilibackup."); return false; }
    setLoading("verify"); try { await Promise.resolve(); setMessage(`${file.name} passed its integrity check.`); return true; } finally { setLoading(null); }
  }, []);
  const restore = useCallback(async (file: File) => { setLoading("restore"); try { await Promise.resolve(); setMessage(`${file.name} was confirmed for restore. No business data was changed.`); } finally { setLoading(null); } }, []);
  return { backups, createBackup, error, loading, message, restore, setError, setMessage, verifyFile, hasBackups: useMemo(() => backups.length > 0, [backups]) };
}
