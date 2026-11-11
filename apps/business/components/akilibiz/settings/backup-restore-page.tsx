"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, FileCheck2, FolderOpen, RotateCcw } from "lucide-react";
import { useBrowserBackupRestore } from "@/components/akilibiz/settings/backup-restore-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function BackupRestorePage() {
  const backup = useBrowserBackupRestore();
  const filePickerRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

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
          <Card className="gap-0 py-0 sm:gap-0 sm:py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Create backup</h2>
                <p className="text-sm text-muted-foreground">
                  Save a copy of your business records when backup storage is available.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled title="Backup creation unavailable">Create backup</Button>
                <Button type="button" variant="outline" disabled title="Backup scheduling unavailable">Schedule backup</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0 sm:gap-0 sm:py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Restore backup</h2>
                <p className="text-sm text-muted-foreground">Check the integrity of a saved backup file.</p>
              </div>
              <input
                ref={filePickerRef}
                className="sr-only"
                type="file"
                accept=".akilibackup"
                aria-label="Select AkiliBiz backup file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border px-3 py-1.5">
                  <span className="min-w-0 truncate text-sm text-muted-foreground" title={selectedFile?.name}>
                    {selectedFile?.name ?? "No backup file selected"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled title="Backup verification unavailable"
                    onClick={() => filePickerRef.current?.click()}
                  >
                    <FolderOpen className="size-4" />
                    Browse
                  </Button>
                </div>
                <Button type="button" variant="outline" disabled title="Backup verification is not connected">
                  Verify file
                </Button>
              </div>
              <Button type="button" disabled title="Backup restoration unavailable">
                Restore backup
              </Button>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0 sm:gap-0 sm:py-0">
            <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Desktop sync</h2>
                <p className="text-sm text-muted-foreground">
                  Connect a desktop business and review the supported synchronization setup.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/desktop-sync">Manage desktop connection</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="min-w-0 gap-0 py-0 sm:gap-0 sm:py-0">
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
                      No backup records available.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </main>
  );
}
