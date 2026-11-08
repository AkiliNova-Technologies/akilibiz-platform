import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  previewImport,
  executeImport,
  clearPreview,
  setColumnMapping,
  setConflictResolution,
  setAutoCreateCategories,
} from "@/redux/slices/importExportSlice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useDropzone } from "react-dropzone";
import { useI18n } from "@/hooks/useI18n";
import { IMPORT_FORMATS, importFormatFromPath } from "@/components/import-formats";
import { ImportDialogShell } from "@/components/ImportDialogShell";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: string;
  onImportComplete?: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  importType,
  onImportComplete,
}: ImportDialogProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const importExportState = useAppSelector((state) => state.importExport);

  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  const resetState = useCallback(() => {
    dispatch(clearPreview());
    setStep("upload");
    setFilePath("");
    setFileName("");
  }, [dispatch]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const processFile = useCallback(
    async (path: string) => {
      setFilePath(path);
      setFileName(path.split("/").pop() || path.split("\\").pop() || "");
      setStep("preview");
      await dispatch(previewImport({ filePath: path, importType }));
    },
    [dispatch, importType],
  );

  const handleFileSelect = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        title: t("importExport.selectFile"),
        filters: [
          {
            name: IMPORT_FORMATS.picker[0].name,
            extensions: [...IMPORT_FORMATS.extensions],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await processFile(selected);
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  };

  // Drag and drop handlers
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        // Check if file has a valid extension
        const validExtensions = IMPORT_FORMATS.extensions.map((extension) => `.${extension}`);
        const hasValidExtension = validExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        );

        if (!hasValidExtension) {
          console.error("Invalid file type");
          return;
        }

        // For drag and drop, we need to get the file path
        // Tauri v2 supports this through the file object
        const filePath = (file as File & { path?: string }).path;
        if (filePath) {
          await processFile(filePath);
        }
      }
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: IMPORT_FORMATS.dropzone,
    multiple: false,
    noClick: true,
  });

  const handleExecuteImport = async () => {
    if (!filePath) return;

    const result = await dispatch(
      executeImport({
        filePath,
        importType,
        columnMappings: importExportState.columnMappings,
        conflictResolution: importExportState.importConfig.conflictResolution,
        autoCreateCategories:
          importExportState.importConfig.autoCreateCategories,
      }),
    ).unwrap();

    if (result && (result.imported_rows > 0 || result.updated_rows > 0)) {
      onImportComplete?.();
    }

    setStep("result");
  };

    const getFieldOptions = () => {
    const commonFields = [
      { value: "id", label: "Id" },
      { value: "name", label: "Name" },
      { value: "description", label: "Description" },
    ];

    const productFields = [
      { value: "sku", label: "SKU" },
      { value: "barcode", label: "Barcode" },
      { value: "brand", label: "Brand" },
      { value: "category", label: "Category" },
      { value: "category_id", label: "Category ID" },
      { value: "product_type", label: "Product Type" },
      { value: "inventory_type", label: "Inventory Type" },

      // Units
      { value: "stock_unit", label: "Stock Unit" },
      { value: "sales_unit", label: "Sales Unit" },
      { value: "purchase_unit", label: "Purchase Unit" },
      { value: "unit_conversion_factor", label: "Unit Conversion Factor" },
      { value: "pack_size", label: "Pack Size" },

      // Pricing
      { value: "cost_price", label: "Cost Price" },
      { value: "selling_price", label: "Selling Price" },
      { value: "wholesale_price", label: "Wholesale Price" },
      { value: "minimum_selling_price", label: "Minimum Selling Price" },

      // Stock Levels
      { value: "stock_quantity", label: "Stock Quantity" },
      { value: "min_stock_level", label: "Min Stock Level" },
      { value: "max_stock_level", label: "Max Stock Level" },

      // Flags
      { value: "allow_decimal_quantity", label: "Allow Decimal Quantity" },
      { value: "allow_negative_stock", label: "Allow Negative Stock" },
      { value: "track_expiry", label: "Track Expiry" },
      { value: "track_batches", label: "Track Batches" },
      { value: "is_taxable", label: "Is Taxable" },
      { value: "is_active", label: "Is Active" },
    ];

    const categoryFields = [
      { value: "id", label: "ID" },
      { value: "name", label: "Name" },
      { value: "description", label: "Description" },
    ];

    const customerFields = [
      { value: "name", label: "Name" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Phone" },
      { value: "address", label: "Address" },
      { value: "customer_type", label: "Customer Type" },
      { value: "credit_limit", label: "Credit Limit" },
      { value: "opening_balance", label: "Opening Balance" },
      { value: "is_active", label: "Is Active" },
    ];

    const supplierFields = [
      { value: "name", label: "Name" },
      { value: "contact_person", label: "Contact Person" },
      { value: "phone", label: "Phone" },
      { value: "email", label: "Email" },
      { value: "address", label: "Address" },
      { value: "payment_terms", label: "Payment Terms" },
      { value: "opening_balance", label: "Opening Balance" },
      { value: "is_active", label: "Is Active" },
    ];

    if (importType === "products") return [...commonFields, ...productFields];
    if (importType === "customers") return customerFields;
    if (importType === "suppliers") return supplierFields;
    return categoryFields;
  };

  return (
    <ImportDialogShell open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : handleClose()}
      title={t("importExport.importTitle", { type: importType })} description={t("importExport.importDescription")}
      steps={["Select file", "Map columns", "Result"]} currentStep={step === "upload" ? "Select file" : step === "preview" ? "Map columns" : "Result"}
      footer={<>{step === "upload" && <Button variant="outline" onClick={handleClose}>{t("pos.cancel")}</Button>}{step === "preview" && importExportState.preview && <><Button variant="outline" onClick={() => setStep("upload")}>{t("importExport.back")}</Button><Button onClick={handleExecuteImport} disabled={importExportState.preview.error_rows > 0 && importExportState.importConfig.conflictResolution === "error"}>{importExportState.importLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t("importExport.importing")}</> : t("importExport.importRecords", { count: importExportState.preview.valid_rows })}</Button></>}{step === "result" && <Button onClick={handleClose}>{t("importExport.done")}</Button>}</>}>

        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}>
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("importExport.dragFile")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("common.or")}
              </p>
              <Button onClick={handleFileSelect} type="button">
                <FileSpreadsheet className="h-4 w-4" />
                {t("importExport.browse")}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: {IMPORT_FORMATS.label}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">{t("importExport.settings")}</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-create">
                  {t("importExport.autoCreateCategories")}
                </Label>
                <Switch
                  id="auto-create"
                  checked={importExportState.importConfig.autoCreateCategories}
                  onCheckedChange={(checked) =>
                    dispatch(setAutoCreateCategories(checked))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("importExport.conflictResolution")}</Label>
                <Select
                  value={importExportState.importConfig.conflictResolution}
                  onValueChange={(value) =>
                    dispatch(
                      setConflictResolution(
                        value as "ask" | "update" | "skip" | "error",
                      ),
                    )
                  }>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("importExport.selectStrategy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">{t("importExport.ask")}</SelectItem>
                    <SelectItem value="update">{t("importExport.updateExisting")}</SelectItem>
                    <SelectItem value="skip">{t("importExport.skipExisting")}</SelectItem>
                    <SelectItem value="error">{t("importExport.reportError")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <div className="space-y-6">
            {importExportState.previewLoading && (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">{t("importExport.analyzing")}</p>
              </div>
            )}

            {importExportState.previewError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="mt-2 text-sm text-red-600">
                  {t("importExport.previewUnavailable")}
                </p>
              </div>
            )}

            {importExportState.preview &&
              !importExportState.previewLoading &&
              !importExportState.previewError && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("importExport.fileAnalysis")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="rounded-xl border bg-muted/40 p-2 text-foreground/70 transition-all duration-200
          group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm
          dark:group-hover:border-primary/40 dark:group-hover:bg-primary/20">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">
                            {fileName} {importFormatFromPath(fileName) && <span className="font-normal text-muted-foreground">· {importFormatFromPath(fileName)}</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="rounded-xl border bg-muted/40 p-2 text-foreground/70 transition-all duration-200
          group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm
          dark:group-hover:border-primary/40 dark:group-hover:bg-primary/20">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                          <span className="text-sm">
                            {t("importExport.validRows", { count: importExportState.preview.valid_rows })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="rounded-xl border bg-muted/40 p-2 text-foreground/70 transition-all duration-200
          group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm
          dark:group-hover:border-primary/40 dark:group-hover:bg-primary/20">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <span className="text-sm">
                            {t("importExport.warnings", { count: importExportState.preview.warning_rows })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="rounded-xl border bg-muted/40 p-2 text-foreground/70 transition-all duration-200
          group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm
          dark:group-hover:border-primary/40 dark:group-hover:bg-primary/20">
                            <XCircle className="h-5 w-5" />
                          </div>
                          <span className="text-sm">
                            {t("importExport.errors", { count: importExportState.preview.error_rows })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button type="button" variant="outline" size="sm" onClick={handleFileSelect}>
                    Change file
                  </Button>

                  {/* Column Mapping */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("importExport.columnMapping")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {importExportState.preview.detected_columns.map(
                          (column) => (
                            <div
                              key={column.source_column}
                              className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center">
                              <div className="min-w-0">
                                <Label className="text-sm">
                                  {column.source_column}
                                </Label>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <Select
                                  value={
                                    importExportState.columnMappings[
                                      column.source_column
                                    ] || ""
                                  }
                                  onValueChange={(value) =>
                                    dispatch(
                                      setColumnMapping({
                                        sourceColumn: column.source_column,
                                        targetField: value,
                                      }),
                                    )
                                  }>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("importExport.selectField")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getFieldOptions().map((field) => (
                                      <SelectItem
                                        key={field.value}
                                        value={field.value}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {column.is_mapped && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs shrink-0">
                                  {t("importExport.match", { percent: Math.round(column.confidence * 100) })}
                                </Badge>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Data */}
                  {importExportState.preview.preview_rows.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("importExport.previewData")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-w-5xl w-full overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {importExportState.preview.detected_columns
                                  .slice(0, 5)
                                  .map((col) => (
                                    <TableHead key={col.source_column}>
                                      {col.source_column}
                                    </TableHead>
                                  ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importExportState.preview.preview_rows
                                .slice(0, 5)
                                .map((row, idx) => (
                                  <TableRow key={idx}>
                                    {importExportState
                                      .preview!.detected_columns.slice(0, 5)
                                      .map((col) => (
                                        <TableCell key={col.source_column}>
                                          {String(
                                            row[col.source_column] || "",
                                          ).slice(0, 50)}
                                        </TableCell>
                                      ))}
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Errors */}
                  {importExportState.preview.validation_errors.length > 0 && (
                    <Card>
                      <CardHeader>
                      <CardTitle>{t("importExport.validationIssues")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {importExportState.preview.validation_errors.map(
                            (error, idx) => (
                              <div
                                key={idx}
                                className={`flex items-start gap-2 text-sm ${
                                  error.severity === "error"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                                }`}>
                                {error.severity === "error" ? (
                                  <XCircle className="h-4 w-4 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 mt-0.5" />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {t("importExport.rowField", { row: error.row_number, field: error.field_name })}
                                  </p>
                                  <p className="text-xs">
                                    {error.error_message}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
          </div>
        )}

        {/* Result Step */}
        {step === "result" && importExportState.importResult && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t("importExport.complete")}</h3>
              <p className="text-muted-foreground">
                {t("importExport.completeDescription")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("importExport.totalRows")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {importExportState.importResult.total_rows}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("importExport.imported")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {importExportState.importResult.imported_rows}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("importExport.updated")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {importExportState.importResult.updated_rows}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("importExport.errorsLabel")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold ">
                    {importExportState.importResult.error_rows}
                  </p>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t("importExport.completedIn", { seconds: (importExportState.importResult.duration_ms / 1000).toFixed(2) })}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {importExportState.importLoading && (
          <div className="mt-4 space-y-2">
            <Progress value={importExportState.importProgress} />
            <p className="text-xs text-muted-foreground text-center">
              {t("importExport.importingWait")}
            </p>
          </div>
        )}
    </ImportDialogShell>
  );
}
