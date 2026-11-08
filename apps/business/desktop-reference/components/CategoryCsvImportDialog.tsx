import { useCallback, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

import { DataTable, type TableData, type TableField } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  CategoryCsvApplyResult,
  CategoryCsvInspectResult,
  CategoryCsvMapping,
  CategoryCsvRowError,
  CategoryCsvValidationResult,
} from "@/types/import-export";
import { useI18n } from "@/hooks/useI18n";
import { IMPORT_FORMATS, importFormatFromPath } from "@/components/import-formats";
import { ImportDialogShell } from "@/components/ImportDialogShell";

type WizardStep = "select" | "mapping" | "review" | "confirm" | "result";
type RequestState = "inspect" | "validate" | "apply" | null;

interface ErrorRow extends CategoryCsvRowError, TableData {}

interface CategoryCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const UNMAPPED = "__unmapped__";

function importErrorMessage(error: unknown, t: ReturnType<typeof useI18n>["t"]): string {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();

  if (lower.includes("session")) {
    return t("imports.sessionExpired", { type: t("categories.category") });
  }
  if (lower.includes("unauthorized")) {
    return t("imports.permissionError", { type: t("categories.category") });
  }
  return t("imports.requestError");
}

export function CategoryCsvImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: CategoryCsvImportDialogProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<WizardStep>("select");
  const [request, setRequest] = useState<RequestState>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [inspection, setInspection] = useState<CategoryCsvInspectResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<CategoryCsvValidationResult | null>(null);
  const [applyResult, setApplyResult] = useState<CategoryCsvApplyResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const busy = request !== null;

  const reset = useCallback(() => {
    setStep("select");
    setRequest(null);
    setRequestError(null);
    setFilePath(null);
    setInspection(null);
    setMappings({});
    setValidation(null);
    setApplyResult(null);
    setConfirmed(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (busy) return;
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [busy, onOpenChange, reset],
  );

  const inspectFile = useCallback(async (path: string) => {
    setRequest("inspect");
    setRequestError(null);
    setValidation(null);
    setApplyResult(null);
    setConfirmed(false);
    try {
      const result = await importExportService.inspectCategoryCsv(path);
      const suggestedMappings = result.suggestions.reduce<Record<string, string>>(
        (current, suggestion) => {
          if (suggestion.target_field) current[suggestion.source_header] = suggestion.target_field;
          return current;
        },
        {},
      );
      setFilePath(path);
      setInspection(result);
      setMappings(suggestedMappings);
      setStep("mapping");
    } catch (error) {
      setRequestError(importErrorMessage(error, t));
    } finally {
      setRequest(null);
    }
  }, [t]);

  const selectFile = useCallback(async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        title: t("imports.selectTitle", { type: t("categories.category") }),
        filters: IMPORT_FORMATS.picker.map(({ name, extensions }) => ({ name, extensions: [...extensions] })),
      });
      if (typeof selected === "string") await inspectFile(selected);
    } catch (error) {
      setRequestError(importErrorMessage(error, t));
    }
  }, [inspectFile, t]);

  const submittedMappings = useMemo<CategoryCsvMapping[]>(
    () => Object.entries(mappings)
      .filter(([, targetField]) => targetField !== UNMAPPED)
      .map(([source_header, target_field]) => ({ source_header, target_field })),
    [mappings],
  );

  const validate = useCallback(async () => {
    if (!filePath) return;
    setRequest("validate");
    setRequestError(null);
    setApplyResult(null);
    setConfirmed(false);
    try {
      const result = await importExportService.validateCategoryCsv(filePath, submittedMappings);
      setValidation(result);
      setStep("review");
    } catch (error) {
      setRequestError(importErrorMessage(error, t));
    } finally {
      setRequest(null);
    }
  }, [filePath, submittedMappings, t]);

  const apply = useCallback(async () => {
    if (!validation?.preview_token) return;
    setRequest("apply");
    setRequestError(null);
    try {
      const result = await importExportService.applyCategoryCsv(validation.preview_token);
      setApplyResult(result);
      setStep("result");
      onImportComplete();
    } catch (error) {
      setRequestError(importErrorMessage(error, t));
    } finally {
      setRequest(null);
    }
  }, [onImportComplete, t, validation?.preview_token]);

  const errors = useMemo<ErrorRow[]>(
    () => (validation?.errors ?? []).map((error, index) => ({
      ...error,
      id: `${error.row_number}-${error.source_column ?? "mapping"}-${index}`,
    })),
    [validation?.errors],
  );

  const errorFields = useMemo<TableField<ErrorRow>[]>(
    () => [
      { key: "row_number", header: t("imports.csvRow"), enableSorting: false },
      { key: "source_column", header: t("imports.sourceColumn"), enableSorting: false, cell: (value) => (value as string | null) ?? "—" },
      { key: "mapped_target", header: t("imports.targetField"), enableSorting: false, cell: (value) => (value as string | null) ?? "—" },
      { key: "error_code", header: t("imports.code"), enableSorting: false },
      { key: "message", header: t("imports.message"), enableSorting: false },
    ],
    [t],
  );

  const stepDescription = {
    select: t("imports.selectDescription", { type: t("categories.category") }),
    mapping: t("imports.mappingDescription", { type: t("categories.category") }),
    review: t("imports.validationReadOnlyCategories"),
    confirm: t("imports.confirmDescription"),
    result: t("imports.resultDescription"),
  }[step];

  return (
    <ImportDialogShell open={open} onOpenChange={handleOpenChange} title={t("imports.title", { type: t("categories.categories") })} description={stepDescription}
      steps={["Select file", "Map columns", "Validate", "Confirm", "Result"]} currentStep={{ select: "Select file", mapping: "Map columns", review: "Validate", confirm: "Confirm", result: "Result" }[step]}
      footer={<><Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>Close</Button><div className="flex gap-2">{step === "mapping" && <Button onClick={validate} disabled={busy}>{request === "validate" && <Loader2 className="size-4 animate-spin" />}Validate import</Button>}{step === "review" && validation && errors.length > 0 && <Button variant="outline" onClick={() => setStep("mapping")} disabled={busy}>Edit mappings</Button>}{step === "review" && validation?.preview_token && errors.length === 0 && <Button onClick={() => setStep("confirm")} disabled={busy}>Continue to confirmation</Button>}{step === "confirm" && <Button onClick={apply} disabled={busy || !confirmed}>{request === "apply" && <Loader2 className="size-4 animate-spin" />}Confirm and apply</Button>}</div></>}>

        {requestError && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{requestError}</p>
          </div>
        )}

        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select file</CardTitle>
              <CardDescription>Supported formats: {IMPORT_FORMATS.label}. Category imports create new categories and never update existing ones.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileSpreadsheet className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">Drag & drop your file here</p>
                <p className="text-sm text-muted-foreground">or</p>
                <p className="mt-1 text-sm text-muted-foreground">The backend will inspect original headers and sample rows before validation.</p>
                <Button className="mt-4" onClick={selectFile} disabled={busy}>
                  {request === "inspect" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Browse files
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "mapping" && inspection && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{inspection.file_name}</CardTitle>
                <CardDescription>{importFormatFromPath(inspection.file_name) ?? "File"} detected. Backend suggestions are shown for review. Name is required; description is optional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="button" variant="outline" size="sm" onClick={selectFile} disabled={busy}>Change file</Button>
                {inspection.source_headers.map((header) => (
                  <div key={header} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                    <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">{header}</div>
                    <Select value={mappings[header] ?? UNMAPPED} onValueChange={(value) => {
                      setMappings((current) => ({ ...current, [header]: value }));
                      setValidation(null);
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Do not import this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED}>Do not import</SelectItem>
                        {inspection.canonical_fields.map((field) => (
                          <SelectItem key={field.field} value={field.field}>
                            {field.field}{field.required ? " (required)" : ""} · {field.value_kind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backend sample</CardTitle>
                <CardDescription>Original CSV headers and a bounded backend-provided preview.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    {inspection.source_headers.map((header) => <th key={header} className="px-2 py-2 font-medium">{header}</th>)}
                  </tr></thead>
                  <tbody>{inspection.sample_rows.map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${row.join("|")}`} className="border-b last:border-0">
                      {inspection.source_headers.map((header, columnIndex) => <td key={header} className="px-2 py-2">{row[columnIndex] || "—"}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "review" && validation && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Validation result</CardTitle>
                <CardDescription>Validation is read-only. No categories have been created.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                <Badge variant="outline">Status: {validation.status}</Badge>
                <Badge variant="outline">CSV rows: {validation.total_rows}</Badge>
                <Badge variant="outline">Valid rows: {validation.valid_rows}</Badge>
              </CardContent>
            </Card>
            {errors.length > 0 ? (
              <DataTable<ErrorRow>
                title="Validation issues"
                description="Correct the CSV or mappings, then validate again."
                data={errors}
                fields={errorFields}
                enableSelection={false}
                enableSorting={false}
                enableGlobalSearch={false}
                enableColumnVisibility={false}
                pageSize={10}
                emptyMessage="No validation issues."
              />
            ) : (
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>The backend validated this create-only import and issued a session for confirmation.</p>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && validation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirm category creation</CardTitle>
              <CardDescription>Category names are create-only. The backend applies the existing slug rule from each name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{validation.valid_rows} categories will be created. Existing names and generated slugs are rejected.</p>
              <Separator />
              <div className="flex items-start gap-3">
                <Checkbox id="confirm-category-import" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />
                <Label htmlFor="confirm-category-import" className="leading-5">I understand that this create-only import will create the validated categories and cannot update existing categories.</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "result" && applyResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="size-5 text-primary" />Import complete</CardTitle>
              <CardDescription>The backend applied the validated session atomically and recorded its audit event.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              <Badge variant="outline">Status: {applyResult.status}</Badge>
              <Badge variant="outline">Created categories: {applyResult.created_rows}</Badge>
              <Badge variant="outline">Audit event: {applyResult.audit_id}</Badge>
            </CardContent>
          </Card>
        )}

    </ImportDialogShell>
  );
}
