import { invoke } from '@tauri-apps/api/core';
import type {
  CategoryCsvApplyResult,
  CategoryCatalogueCsvExportResult,
  CategoryCsvInspectResult,
  CategoryCsvMapping,
  CategoryCsvValidationResult,
  CsvImportAuditDetail,
  CsvImportHistoryItem,
  CsvImportHistoryQuery,
  ProductCsvApplyResult,
  ProductCsvInspectResult,
  ProductCsvMapping,
  ProductCsvValidationResult,
  ProductCatalogueCsvExportResult,
} from '@/types/import-export';

export interface ImportPreviewData {
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  detected_columns: ColumnMapping[];
  preview_rows: Record<string, unknown>[];
  validation_errors: RowValidationError[];
}

export interface ColumnMapping {
  source_column: string;
  target_field: string;
  confidence: number;
  is_mapped: boolean;
}

export interface RowValidationError {
  row_number: number;
  field_name: string;
  error_message: string;
  severity: string;
  raw_data: Record<string, unknown>;
}

export interface ImportResult {
  import_id: number;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
  duration_ms: number;
}

export interface ExportResult {
  file_name: string;
  total_rows: number;
  file_size_bytes: number;
}

export interface ImportHistoryItem {
  id: number;
  import_type: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
  performed_by: number | null;
  created_at: string;
}

export const importExportService = {
  async getCsvImportHistory(query: CsvImportHistoryQuery): Promise<CsvImportHistoryItem[]> {
    return invoke('get_import_history', { ...query });
  },
  async getImportAuditDetail(importType: CsvImportHistoryQuery['import_type'], auditId: number): Promise<CsvImportAuditDetail> {
    return invoke('get_import_audit_detail', { importType, auditId });
  },
  async inspectCategoryCsv(filePath: string): Promise<CategoryCsvInspectResult> {
    return invoke('inspect_category_csv', {
      payload: { file_path: filePath },
    });
  },

  async validateCategoryCsv(
    filePath: string,
    mappings: CategoryCsvMapping[],
  ): Promise<CategoryCsvValidationResult> {
    return invoke('validate_category_csv', {
      payload: { file_path: filePath, mappings },
    });
  },

  async applyCategoryCsv(previewToken: string): Promise<CategoryCsvApplyResult> {
    return invoke('apply_category_csv', {
      payload: {
        preview_token: previewToken,
        confirmation: 'CREATE_CATEGORIES',
      },
    });
  },

  async inspectProductCsv(filePath: string): Promise<ProductCsvInspectResult> {
    return invoke('inspect_product_csv', {
      payload: { file_path: filePath },
    });
  },

  async validateProductCsv(
    filePath: string,
    mappings: ProductCsvMapping[],
  ): Promise<ProductCsvValidationResult> {
    return invoke('validate_product_csv', {
      payload: { file_path: filePath, mappings },
    });
  },

  async applyProductCsv(previewToken: string): Promise<ProductCsvApplyResult> {
    return invoke('apply_product_csv', {
      payload: {
        preview_token: previewToken,
        confirmation: 'CREATE_PRODUCTS',
      },
    });
  },

  async exportProductCatalogueCsv(
    destinationPath: string,
    overwrite = false,
  ): Promise<ProductCatalogueCsvExportResult> {
    return invoke('export_product_catalogue_csv', {
      payload: {
        destination_path: destinationPath,
        overwrite,
      },
    });
  },

  async exportCategoryCatalogueCsv(
    destinationPath: string,
    overwrite = false,
  ): Promise<CategoryCatalogueCsvExportResult> {
    return invoke('export_category_catalogue_csv', {
      payload: {
        destination_path: destinationPath,
        overwrite,
      },
    });
  },

  async previewImport(
    filePath: string,
    importType: string,
    sheetName?: string
  ): Promise<ImportPreviewData> {
    return invoke('preview_import', {
      payload: {
        file_path: filePath,
        import_type: importType,
        sheet_name: sheetName,
      },
    });
  },

  async executeImport(
    filePath: string,
    importType: string,
    columnMappings: Record<string, string>,
    conflictResolution: string = 'ask',
    autoCreateCategories: boolean = true,
    sheetName?: string
  ): Promise<ImportResult> {
    return invoke('execute_import', {
      payload: {
        file_path: filePath,
        import_type: importType,
        sheet_name: sheetName,
        column_mappings: columnMappings,
        conflict_resolution: conflictResolution,
        auto_create_categories: autoCreateCategories,
      },
    });
  },

  async exportData(
    exportType: string,
    format: string,
    destinationPath: string,
    filters?: {
      category_id?: number;
      search?: string;
      is_active?: boolean;
      low_stock_only?: boolean;
    }
  ): Promise<ExportResult> {
    return invoke('export_data', {
      payload: {
        export_type: exportType,
        format,
        destination_path: destinationPath,
        overwrite: false,
        filters,
      },
    });
  },

  async getImportHistory(
    importType?: string,
    skip?: number,
    limit?: number
  ): Promise<ImportHistoryItem[]> {
    return invoke('get_import_history', {
      importType: importType || null,
      skip: skip || 0,
      limit: limit || 50,
    });
  },

  async getImportErrors(importId: number): Promise<unknown[]> {
    return invoke('get_import_errors', {
      importId,
    });
  },
};
