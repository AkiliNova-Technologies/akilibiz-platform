import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  exportData,
  clearExportResult,
} from "@/redux/slices/importExportSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Download,
  FileJson,
  FileText,
  Loader2,
  CheckCircle,
  FolderOpen,
} from "lucide-react";
import { downloadDir } from "@tauri-apps/api/path";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: string;
}

export function ExportDialog({ open, onOpenChange, exportType }: ExportDialogProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const importExportState = useAppSelector((state) => state.importExport);

  const [format, setFormat] = useState("csv");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleClose = () => {
    dispatch(clearExportResult());
    setSaveSuccess(false);
    onOpenChange(false);
  };

  const handleExport = async () => {
    try {
      setSaveSuccess(false);
      
      const downloadsPath = await downloadDir();
      const fileName = `${exportType}_export_${Date.now()}.${format}`;

      // Rust writes directly to the chosen native Downloads destination after validating it.
      const result = await dispatch(
        exportData({
          exportType,
          format,
          destinationPath: `${downloadsPath}${fileName}`,
          filters: {
            is_active: includeInactive ? undefined : true,
          },
        })
      ).unwrap();

      setSaveSuccess(true);
      toast.success(t("importExport.savedDownloads"), {
        description: result.file_name,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("importExport.exportFailed"), {
        description: t("importExport.exportUnavailable"),
      });
    }
  };

  const formatIcons = {
    csv: <FileText className="h-5 w-5" />,
    json: <FileJson className="h-5 w-5" />,
  };

  const formatDescriptions = {
    csv: t("importExport.csvDescription"),
    json: t("importExport.jsonDescription"),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("importExport.exportTitle", { type: exportType })}</DialogTitle>
          <DialogDescription>
            {t("importExport.exportDescription", { type: exportType })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t("importExport.exportFormat")}</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("importExport.selectFormat")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    {formatIcons.csv}
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    {formatIcons.json}
                    JSON
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formatDescriptions[format as keyof typeof formatDescriptions]}
            </p>
          </div>

          {exportType === "products" && (
            <div className="flex items-center justify-between">
              <Label htmlFor="include-inactive">{t("importExport.includeInactive")}</Label>
              <Switch
                id="include-inactive"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
            </div>
          )}

          {importExportState.exportResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                {t("importExport.exportedRecords", { count: importExportState.exportResult.total_rows })}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {t("importExport.fileSize", { size: (importExportState.exportResult.file_size_bytes / 1024).toFixed(2) })}
              </p>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t("importExport.savedDownloads")}
              </span>
              <FolderOpen className="h-4 w-4 ml-auto text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("pos.cancel")}
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={importExportState.exportLoading}
          >
            {importExportState.exportLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("importExport.exporting")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("importExport.exportDownloads")}
              </>
            )}
          </Button>
        </DialogFooter>

        {importExportState.exportLoading && (
          <div className="mt-4 space-y-2">
            <Progress value={importExportState.exportProgress} />
            <p className="text-xs text-muted-foreground text-center">
              {t("importExport.exportingData")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
