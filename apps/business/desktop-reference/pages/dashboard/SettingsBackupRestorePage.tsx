import * as React from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { IconDatabase } from "@tabler/icons-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReduxSettings } from "@/hooks/useReduxSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsBackupRestorePage() {
  const { loading, error, clearError, saveBackup, checkBackup } =
    useReduxSettings();
  const { can, loadingAuth } = usePermissions();
  const canCreateBackup = can("backup.create");
  const [overwritePath, setOverwritePath] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<string | null>(null);

  React.useEffect(() => () => clearError(), [clearError]);

  const createBackup = React.useCallback(
    async (destinationPath: string, overwrite: boolean) => {
      try {
        const result = await saveBackup({
          destination_path: destinationPath,
          overwrite,
        });
        setOverwritePath(null);
        setVerification(
          `${result.backup_path} was created and integrity checked.`,
        );
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message.toLowerCase() : "";
        if (!overwrite && message.includes("already exists"))
          setOverwritePath(destinationPath);
      }
    },
    [saveBackup],
  );

  const chooseBackupDestination = React.useCallback(async () => {
    clearError();
    try {
      const destination = await save({
        title: "Create AkiliBiz Backup",
        defaultPath: `akilibiz-backup-${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z.akilibackup`,
        filters: [{ name: "AkiliBiz Backup", extensions: ["akilibackup"] }],
      });
      if (typeof destination === "string")
        await createBackup(destination, false);
    } catch {
      // A dismissed native dialog is intentionally a no-op.
    }
  }, [clearError, createBackup]);

  const chooseBackupToVerify = React.useCallback(async () => {
    clearError();
    try {
      const source = await open({
        title: "Verify AkiliBiz Backup",
        multiple: false,
        directory: false,
        filters: [{ name: "AkiliBiz Backup", extensions: ["akilibackup"] }],
      });
      if (typeof source === "string") {
        const result = await checkBackup(source);
        setVerification(`${result.file_name} passed its integrity check.`);
      }
    } catch {
      // The hook presents the safe backend error; cancellation is a no-op.
    }
  }, [checkBackup, clearError]);

  return (
    <>
      <SiteHeader label="Backup & Restore" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Backup & Restore</h2>
            <p className="text-sm text-muted-foreground">
              Create a local, integrity-checked snapshot of the current business
              database.
            </p>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {verification && (
            <p className="rounded-md border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {verification}
            </p>
          )}
          <section className="max-w-2xl">
            <Card>
              <CardContent className="">
            <div className="flex items-start gap-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Local Backup</h3>
                <p className="text-sm text-muted-foreground">
                  Backups are saved as <code>.akilibackup</code> files and
                  verified before they are recorded. Restore is deliberately
                  unavailable in this release.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={chooseBackupDestination}
                disabled={loading || loadingAuth || !canCreateBackup}>
                <IconDatabase className="mr-2 size-4" />
                {loading ? "Working…" : "Create Backup"}
              </Button>
              <Button
                variant="outline"
                onClick={chooseBackupToVerify}
                disabled={loading || loadingAuth || !canCreateBackup}>
                Verify Backup
              </Button>
              <Button
                variant="outline"
                disabled
                title="Restore is not available yet">
                Restore unavailable
              </Button>
            </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      <Dialog
        open={overwritePath !== null}
        onOpenChange={(value) => !value && setOverwritePath(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace existing backup?</DialogTitle>
            <DialogDescription>
              A file with this name already exists. Replacing it cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverwritePath(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() =>
                overwritePath && createBackup(overwritePath, true)
              }>
              Replace backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
