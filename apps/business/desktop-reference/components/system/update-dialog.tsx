import * as React from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatUpdateBytes, initialUpdaterState, isWindowsPlatform, progressFromDownloadEvent, progressPercentage, publicUpdateError, type AvailableUpdate, type UpdaterState } from "@/services/update-service";

const busy = (phase: UpdaterState["phase"]) => phase === "checking" || phase === "downloading" || phase === "installing";

export function UpdateDialog() {
  const [state, setState] = React.useState<UpdaterState>(initialUpdaterState);
  const [open, setOpen] = React.useState(false);
  const updateRef = React.useRef<AvailableUpdate | null>(null);
  const checkingRef = React.useRef(false);
  const operationRef = React.useRef(false);
  const windows = isWindowsPlatform();

  const checkForUpdate = React.useCallback(async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      setState({ phase: "checking", progress: { downloadedBytes: 0 } });
      try {
        const update = await check();
        if (!update) { setState({ phase: "up_to_date", progress: { downloadedBytes: 0 } }); return; }
        updateRef.current = update;
        setState({ phase: "update_available", version: update.version, progress: { downloadedBytes: 0 } });
        setOpen(true);
      } catch (error) {
        setState({ phase: "error", progress: { downloadedBytes: 0 }, error: publicUpdateError(error) });
        setOpen(true);
      } finally { checkingRef.current = false; }
    }, []);

  React.useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  const downloadAndInstall = async () => {
    const update = updateRef.current;
    if (!update || operationRef.current) return;
    operationRef.current = true;
    setState((current) => ({ ...current, phase: "downloading", error: undefined }));
    try {
      await update.download((event) => setState((current) => ({ ...current, phase: "downloading", progress: progressFromDownloadEvent(current.progress, event) })));
      setState((current) => ({ ...current, phase: "installing" }));
      await update.install();
      setState((current) => ({ ...current, phase: windows ? "completed" : "restart_required" }));
    } catch (error) {
      setState((current) => ({ ...current, phase: "error", error: publicUpdateError(error) }));
    } finally { operationRef.current = false; }
  };
  const restartNow = async () => {
    if (operationRef.current) return;
    operationRef.current = true;
    try { await relaunch(); }
    catch (error) { setState((current) => ({ ...current, phase: "error", error: publicUpdateError(error) })); operationRef.current = false; }
  };
  const tryAgain = () => {
    if (updateRef.current) void downloadAndInstall();
    else void checkForUpdate();
  };
  const percentage = progressPercentage(state.progress);
  const canDismiss = !busy(state.phase);
  const status = state.phase === "checking" ? "Checking for updates…" : state.phase === "update_available" ? "A verified update is ready to download." : state.phase === "downloading" ? "Downloading update…" : state.phase === "installing" ? "Installing update…" : state.phase === "restart_required" ? "The update is installed and ready to restart." : state.phase === "completed" ? "The Windows installer has been started. AkiliBiz will close if required." : state.phase === "up_to_date" ? "AkiliBiz is up to date." : state.error ?? "Update status unavailable.";
  return <>
    {(state.phase === "update_available" || state.phase === "restart_required") && !open && <Button variant="outline" size="sm" className="fixed right-4 bottom-4 z-40 shadow-md" onClick={() => setOpen(true)} aria-label={state.phase === "restart_required" ? "Open pending restart" : "Open available update"}>{state.phase === "restart_required" ? "Restart update" : "Update available"}</Button>}
    <Dialog open={open} onOpenChange={(next) => canDismiss && setOpen(next)}>
      <DialogContent showCloseButton={canDismiss} className="sm:max-w-md">
        <DialogHeader><DialogTitle>{state.version ? `AkiliBiz ${state.version}` : "AkiliBiz update"}</DialogTitle><DialogDescription aria-live="polite">{status}</DialogDescription></DialogHeader>
        {(state.phase === "downloading" || state.phase === "installing") && <div className="space-y-2"><Progress value={percentage} aria-label="Update download progress" aria-valuetext={percentage === undefined ? `${formatUpdateBytes(state.progress.downloadedBytes)} downloaded; total size unavailable` : `${percentage}% downloaded`} /><div className="flex justify-between text-sm text-muted-foreground"><span>{formatUpdateBytes(state.progress.downloadedBytes)} downloaded</span><span>{percentage === undefined ? "Total size unavailable" : `${percentage}% of ${formatUpdateBytes(state.progress.contentLength)}`}</span></div></div>}
        {state.phase === "error" && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
        <DialogFooter>
          {state.phase === "update_available" && <><Button variant="outline" onClick={() => setOpen(false)}>Later</Button><Button onClick={() => void downloadAndInstall()}>Download and install</Button></>}
          {state.phase === "restart_required" && <><Button variant="outline" onClick={() => setOpen(false)}>Later</Button><Button onClick={() => void restartNow()}>Restart now</Button></>}
          {state.phase === "completed" && <Button onClick={() => setOpen(false)}>Close</Button>}
          {state.phase === "error" && <><Button variant="outline" onClick={() => setOpen(false)}>Later</Button><Button onClick={tryAgain}>Try again</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
