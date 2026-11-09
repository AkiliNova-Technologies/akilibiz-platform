"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, FileCheck2, RotateCcw } from "lucide-react";
import { useBrowserBackupRestore } from "@/components/akilibiz/settings/backup-restore-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function BackupRestorePage() {
  const backup = useBrowserBackupRestore();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="space-y-1 pt-1">
        <h1 className="text-xl font-semibold sm:text-2xl">Backup, Restore &amp; Sync</h1>
        <p className="text-sm text-muted-foreground">
          Protect business records with backups and connect your desktop to AkiliBiz Web.
        </p>
      </div>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Create backup</h2>
                <p className="text-sm text-muted-foreground">
                  Save a copy of your business records when backup storage is available.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled title="Cloud backup creation is not connected">Create backup</Button>
                <Button type="button" variant="outline" disabled title="Backup scheduling is not connected">Schedule backup</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This web application cannot yet create or schedule a downloadable backup.
              </p>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Restore backup</h2>
                <p className="text-sm text-muted-foreground">Choose a backup file before requesting a restore.</p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input type="file" accept=".akilibackup" aria-label="Select AkiliBiz backup file"
                  className="min-w-0" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" disabled title="Backup verification is not connected">
                  Verify file
                </Button>
              </div>
              <Button type="button" disabled={!selectedFile} onClick={() => setRestoreOpen(true)}>
                Restore backup
              </Button>
              <p className="text-xs text-muted-foreground">
                Restore is not available on the web yet. You can review the confirmation, but the restore action remains disabled.
              </p>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Desktop sync</h2>
                <p className="text-sm text-muted-foreground">
                  Connect a desktop business and review the supported synchronization setup.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">Connection status</span>
                <span className="font-medium">Check connection details</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/desktop-sync">Open desktop synchronization</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Pairing does not synchronize sales, payments or accounting transactions.
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="min-w-0 gap-0 py-0 xl:min-h-[32rem]">
          <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Backup history</h2>
              <p className="text-sm text-muted-foreground">Recent backup records for this business.</p>
            </div>
            <div className="min-w-0 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date &amp; time</th>
                    <th className="px-3 py-2 font-medium">File name</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backup.backups.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString("en-UG")}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.size}</td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" disabled aria-label="View backup" title="View backup"><Eye className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" disabled aria-label="Verify backup" title="Verify backup"><FileCheck2 className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" disabled aria-label="Restore backup" title="Restore backup"><RotateCcw className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {backup.backups.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-7 text-center text-sm text-muted-foreground">
                      Backup history is unavailable until the secure backup service is connected.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={restoreOpen} onOpenChange={(open) => {
        setRestoreOpen(open);
        if (!open) setConfirmation("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              Restoring a backup would replace the current business records. Confirm the business and selected file before proceeding. The web restore service is not connected.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && <p className="break-all text-sm">Selected file: {selectedFile.name}</p>}
          <div className="space-y-2">
            <label htmlFor="backup-restore-confirmation" className="text-sm font-medium">Type RESTORE to confirm</label>
            <Input id="backup-restore-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setRestoreOpen(false)}>Cancel</Button>
            <Button type="button" disabled title="Web restore is not connected">
              Confirm restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
