import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchImportHistory,
} from "@/redux/slices/importExportSlice";
import { DataTable } from "@/components/data-table";
import type { TableData, TableField } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Define the type for import history items
interface ImportHistoryData extends TableData {
  id: string | number;
  import_type: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
  created_at: string;
}

export function ImportHistoryTable() {
  const dispatch = useAppDispatch();
  const importExportState = useAppSelector((state) => state.importExport);

  useEffect(() => {
    dispatch(fetchImportHistory(undefined));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchImportHistory(undefined));
  };

  // Define fields for the DataTable
  const fields: TableField<ImportHistoryData>[] = [
    {
      key: "created_at",
      header: "Date",
      cell: (value) => {
        const date = new Date(value as string);
        return (
          <span className="text-sm">
            {date.toLocaleDateString("en-UG", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      key: "import_type",
      header: "Type",
      cell: (value) => (
        <span className="capitalize">{value as string}</span>
      ),
    },
    {
      key: "file_name",
      header: "File",
      cell: (value) => (
        <span className="text-sm">{value as string}</span>
      ),
    },
    {
      key: "total_rows",
      header: "Total",
      align: "right",
      cell: (value) => (
        <span className="font-medium">{value as number}</span>
      ),
    },
    {
      key: "imported_rows",
      header: "Imported",
      align: "right",
      cell: (value) => (
        <span className="text-green-600 font-medium">{value as number}</span>
      ),
    },
    {
      key: "updated_rows",
      header: "Updated",
      align: "right",
      cell: (value) => (
        <span className="text-blue-600 font-medium">{value as number}</span>
      ),
    },
    {
      key: "error_rows",
      header: "Errors",
      align: "right",
      cell: (value) => {
        const errorCount = value as number;
        return (
          <span className={errorCount > 0 ? "text-red-600 font-medium" : ""}>
            {errorCount}
          </span>
        );
      },
    },
  ];

  // Transform the import history data
  const tableData: ImportHistoryData[] = importExportState.importHistory.map(
    (item) => ({
      id: item.id,
      import_type: item.import_type,
      file_name: item.file_name,
      total_rows: item.total_rows,
      imported_rows: item.imported_rows,
      updated_rows: item.updated_rows,
      skipped_rows: item.skipped_rows,
      error_rows: item.error_rows,
      created_at: item.created_at,
    })
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import History</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          data={tableData}
          fields={fields}
          loading={importExportState.historyLoading}
          enableSelection={false}
          enablePagination={true}
          pageSize={10}
          enableGlobalSearch={true}
          searchPlaceholder="Search imports..."
          emptyMessage="No imports yet"
        />
      </CardContent>
    </Card>
  );
}