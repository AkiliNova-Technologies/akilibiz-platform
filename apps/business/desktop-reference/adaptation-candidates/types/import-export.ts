export type ImportType = 'products' | 'categories' | 'customers' | 'suppliers';
export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ConflictResolution = 'ask' | 'update' | 'skip' | 'error';

export interface ImportConfig {
  importType: ImportType;
  conflictResolution: ConflictResolution;
  autoCreateCategories: boolean;
  columnMappings: Record<string, string>;
}

export interface ExportConfig {
  exportType: ImportType;
  format: ExportFormat;
  filters?: {
    category_id?: number;
    search?: string;
    is_active?: boolean;
    low_stock_only?: boolean;
  };
}

export interface ProductCsvField {
  field: string;
  required: boolean;
  value_kind: string;
}

export interface ProductCsvSuggestion {
  source_header: string;
  target_field: string | null;
}

export interface ProductCsvInspectResult {
  file_name: string;
  source_headers: string[];
  sample_rows: string[][];
  canonical_fields: ProductCsvField[];
  suggestions: ProductCsvSuggestion[];
}

export interface ProductCsvMapping {
  source_header: string;
  target_field: string;
}

export interface ProductCsvRowError {
  row_number: number;
  source_column: string | null;
  mapped_target: string | null;
  error_code: string;
  message: string;
}

export interface ProductCsvValidationResult {
  preview_token: string | null;
  total_rows: number;
  valid_rows: number;
  errors: ProductCsvRowError[];
  status: string;
}

export interface ProductCsvApplyResult {
  audit_id: number;
  created_product_ids: number[];
  created_rows: number;
  status: string;
}

export interface ProductCatalogueCsvExportResult {
  status: string;
  file_name: string;
  row_count: number;
  audit_id: number;
}

export interface CategoryCatalogueCsvExportResult {
  status: string;
  file_name: string;
  row_count: number;
  audit_id: number;
}

export interface CategoryCsvField {
  field: string;
  required: boolean;
  value_kind: string;
}

export interface CategoryCsvSuggestion {
  source_header: string;
  target_field: string | null;
}

export interface CategoryCsvInspectResult {
  file_name: string;
  source_headers: string[];
  sample_rows: string[][];
  canonical_fields: CategoryCsvField[];
  suggestions: CategoryCsvSuggestion[];
}

export interface CategoryCsvMapping {
  source_header: string;
  target_field: string;
}

export interface CategoryCsvRowError {
  row_number: number;
  source_column: string | null;
  mapped_target: string | null;
  error_code: string;
  message: string;
}

export interface CategoryCsvValidationResult {
  preview_token: string | null;
  total_rows: number;
  valid_rows: number;
  errors: CategoryCsvRowError[];
  status: string;
}

export interface CategoryCsvApplyResult {
  audit_id: number;
  created_category_ids: number[];
  created_rows: number;
  status: string;
}

export type CsvImportType = "product" | "category";
export interface CsvImportHistoryQuery { import_type: CsvImportType; date_from?: string; date_to?: string; outcome?: string; skip?: number; limit?: number; }
export interface CsvImportHistoryItem { audit_id: number; import_type: CsvImportType; actor_staff_id: number; actor_name: string | null; file_name: string; completed_at_utc: string; outcome: string; total_rows: number; created_rows: number; rejected_rows: number; error_rows: number; }
export interface ImportAuditMapping { source_header: string; target_field: string; }
export interface CsvImportAuditDetail { status: string; audit_id: number; import_type: CsvImportType; actor_staff_id: number; actor_name: string | null; file_name: string; file_hash: string | null; completed_at_utc: string; outcome: string; total_rows: number; created_rows: number; rejected_rows: number; error_rows: number; mapping: ImportAuditMapping[]; created_record_ids: number[]; error_summary: string | null; }
