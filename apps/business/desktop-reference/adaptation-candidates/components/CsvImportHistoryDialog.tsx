import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/date-range-picker";
import { ReportPeriodSelect } from "@/components/report-period-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { importExportService } from "@/services/tauri/import-export";
import type {
  CsvImportAuditDetail,
  CsvImportHistoryItem,
  CsvImportType,
} from "@/types/import-export";
import { IconRefresh } from "@tabler/icons-react";

interface Row extends CsvImportHistoryItem, TableData {
  id: number;
}
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: CsvImportType;
}
const PAGE_SIZE = 25;
const typeLabel = (type: CsvImportType) =>
  type === "product" ? "Product" : "Category";
function message(error: unknown) {
  const text = error instanceof Error ? error.message.toLowerCase() : "";
  if (text.includes("permission") || text.includes("unauthorized"))
    return "You do not have permission to view this import audit.";
  if (text.includes("not found") || text.includes("unavailable"))
    return "This import audit detail is unavailable.";
  return "Import history is currently unavailable.";
}

export function CsvImportHistoryDialog({
  open,
  onOpenChange,
  importType,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [draftOutcome, setDraftOutcome] = useState("all");
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<CsvImportAuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await importExportService.getCsvImportHistory({
        import_type: importType,
        date_from: from || undefined,
        date_to: to || undefined,
        outcome: outcome === "all" ? undefined : outcome,
        skip,
        limit: PAGE_SIZE,
      });
      setRows(result.map((item) => ({ ...item, id: item.audit_id })));
    } catch (requestError) {
      setRows([]);
      setError(message(requestError));
    } finally {
      setLoading(false);
    }
  }, [from, importType, outcome, skip, to]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const openDetail = useCallback(
    async (row: Row) => {
      setSelected(row);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        setDetail(
          await importExportService.getImportAuditDetail(
            importType,
            row.audit_id,
          ),
        );
      } catch (requestError) {
        setDetailError(message(requestError));
      } finally {
        setDetailLoading(false);
      }
    },
    [importType],
  );

  const fields = useMemo<TableField<Row>[]>(
    () => [
      {
        key: "completed_at_utc",
        header: "Completed (UTC)",
        enableSorting: false,
      },
      { key: "file_name", header: "Filename", enableSorting: false },
      {
        key: "outcome",
        header: "Outcome",
        enableSorting: false,
        cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
      },
      {
        key: "total_rows",
        header: "Total",
        align: "center",
        enableSorting: false,
      },
      {
        key: "created_rows",
        header: "Created",
        align: "center",
        enableSorting: false,
      },
      {
        key: "rejected_rows",
        header: "Rejected",
        align: "center",
        enableSorting: false,
      },
      {
        key: "actor_name",
        header: "Actor",
        enableSorting: false,
        cell: (value, row) =>
          (value as string | null) ?? `Staff #${row.actor_staff_id}`,
      },
    ],
    [],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{typeLabel(importType)} Import History</DialogTitle>
            <DialogDescription>
              Read-only completed CSV imports in backend-provided newest-first
              order.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              {error}
            </p>
          )}
          <Card>
            <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
              <DateRangePicker
                id={`${importType}-import-history-range`}
                label="Date range (UTC)"
                from={draftFrom}
                to={draftTo}
                onRangeChange={(nextFrom, nextTo) => {
                  setDraftFrom(nextFrom);
                  setDraftTo(nextTo);
                }}
                numberOfMonths={1}
              />
              <ReportPeriodSelect
                id={`${importType}-import-history-period`}
                selectedEndDate={draftTo}
                onRangeChange={(nextFrom, nextTo) => {
                  setDraftFrom(nextFrom);
                  setDraftTo(nextTo);
                }}
              />
              <div className="grid gap-2">
                <Label>Outcome</Label>
                <Select value={draftOutcome} onValueChange={setDraftOutcome}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={() => {
                    setFrom(draftFrom);
                    setTo(draftTo);
                    setOutcome(draftOutcome);
                    setSkip(0);
                  }}
                  disabled={loading || !draftFrom || !draftTo}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Apply period
                </Button>
              </div>
            </CardContent>
          </Card>
          <DataTable<Row>
            title="Completed imports"
            description="UTC date and outcome filters are applied by the backend."
            data={rows}
            fields={fields}
            loading={loading}
            actions={[
              { type: "view", label: "View import audit", onClick: openDetail },
            ]}
            onRowClick={openDetail}
            enableSelection={false}
            enableSorting={false}
            enableGlobalSearch={false}
            enableColumnVisibility={false}
            enablePagination={false}
            emptyMessage={
              loading
                ? "Loading import history…"
                : "No completed imports match these filters."
            }
            toolbarActions={
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => void load()}
                  disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  <IconRefresh className="size-4" />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setDraftFrom("");
                    setDraftTo("");
                    setOutcome("all");
                    setDraftOutcome("all");
                    setSkip(0);
                  }}
                  disabled={loading}>
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setSkip((value) => Math.max(0, value - PAGE_SIZE))
                  }
                  disabled={loading || skip === 0}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSkip((value) => value + PAGE_SIZE)}
                  disabled={loading || rows.length < PAGE_SIZE}>
                  Next
                </Button>
              </div>
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={selected !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelected(null);
        }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{typeLabel(importType)} import audit</DialogTitle>
            <DialogDescription>
              Read-only persisted audit metadata and validated references.
            </DialogDescription>
          </DialogHeader>
          {detailLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading audit detail…
            </p>
          )}
          {detailError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              {detailError}
            </p>
          )}
          {detail && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Filename</span>
                    <p>{detail.file_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Completed (UTC)
                    </span>
                    <p>{detail.completed_at_utc}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actor</span>
                    <p>
                      {detail.actor_name ?? `Staff #${detail.actor_staff_id}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outcome</span>
                    <p>
                      <Badge variant="outline">{detail.outcome}</Badge>
                    </p>
                  </div>
                  {detail.file_hash && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Source hash</span>
                      <p className="break-all font-mono text-xs">
                        {detail.file_hash}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Validated mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detail.mapping.map((mapping) => (
                    <div
                      key={`${mapping.source_header}-${mapping.target_field}`}
                      className="grid grid-cols-2 gap-3 rounded-md border p-2 text-sm">
                      <span className="font-mono">{mapping.source_header}</span>
                      <span>{mapping.target_field}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Outcome and created records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Total: {detail.total_rows}</Badge>
                    <Badge variant="outline">
                      Created: {detail.created_rows}
                    </Badge>
                    <Badge variant="outline">
                      Rejected: {detail.rejected_rows}
                    </Badge>
                    <Badge variant="outline">Errors: {detail.error_rows}</Badge>
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-2 text-muted-foreground">
                      Created record references
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.created_record_ids.length ? (
                        detail.created_record_ids.map((id) => (
                          <Badge key={id} variant="secondary">
                            #{id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          Unavailable.
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">Error summary</p>
                    <p>
                      {detail.error_summary ??
                        "No stored error summary is available for this completed import."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
