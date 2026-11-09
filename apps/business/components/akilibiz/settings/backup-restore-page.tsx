"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Database,
  FileCheck2,
  FolderOpen,
  History,
  RotateCcw,
} from "lucide-react";

import { useBrowserBackupRestore } from "@/components/akilibiz/settings/backup-restore-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function BackupRestorePage() {
  const backup = useBrowserBackupRestore();
  const picker = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const selectFile = async (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    const verified = await backup.verifyFile(file);
    if (verified) toast.success("Backup file verified");
    else toast.error("Choose a valid backup file");
  };
  const confirmRestore = async () => {
    if (!selectedFile || confirmation !== "RESTORE") return;
    await backup.restore(selectedFile);
    setRestoreOpen(false);
    setConfirmation("");
    toast.success("Restore confirmation recorded");
  };
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Backup &amp; Restore
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create a local snapshot of your business information and check
            backup files before using them.
          </p>
        </div>
        {backup.error ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Check the selected file</AlertTitle>
            <AlertDescription>{backup.error}</AlertDescription>
          </Alert>
        ) : null}
        {backup.message ? (
          <Alert>
            <FileCheck2 className="size-4" />
            <AlertTitle>Backup activity</AlertTitle>
            <AlertDescription>{backup.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.7fr)]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 size-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">Create a backup</h2>
                    <p className="text-sm text-muted-foreground">
                      Create a snapshot for your records. Each new backup is
                      checked before it appears in the history below.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => void backup.createBackup()}
                  disabled title="Backup creation is not connected">
                  <Database className="mr-2 size-4" />
                  {backup.loading === "create"
                    ? "Creating backup…"
                    : "Create Backup"}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <FolderOpen className="mt-0.5 size-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">
                      Check or restore a backup
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Choose an AkiliBiz backup file to check it first.
                      Restoring replaces current business information, so it
                      always requires confirmation.
                    </p>
                  </div>
                </div>
                <input
                  ref={picker}
                  className="sr-only"
                  type="file"
                  accept=".akilibackup"
                  onChange={(event) => void selectFile(event.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => picker.current?.click()}
                    disabled title="Backup file verification is not connected">
                    <FolderOpen className="mr-2 size-4" />
                    Choose backup file
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRestoreOpen(true)}
                    disabled title="Backup restore is not connected">
                    <RotateCcw className="mr-2 size-4" />
                    Restore backup
                  </Button>
                </div>
                {selectedFile ? (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No backup file selected.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="">
              <div className="mb-4 flex items-center gap-2">
                <History className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Backup history</h2>
              </div>
              {!backup.hasBackups ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="font-medium">Backup history unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Backup records will appear when the secure backup service is connected.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {backup.backups.map((item) => (
                    <li key={item.id} className="rounded-lg border p-3">
                      <p className="break-all text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-UG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}{" "}
                        · {item.size}
                      </p>
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        {item.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              Restoring replaces the business information currently in use.
              Check that you selected the correct backup before continuing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="restore-confirmation"
              className="text-sm font-medium">
              Type RESTORE to confirm
            </label>
            <Input
              id="restore-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled title="Backup restore is not connected"
              onClick={() => void confirmRestore()}>
              {backup.loading === "restore" ? "Restoring…" : "Restore backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
