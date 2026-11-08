import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { importExportService } from '@/services/tauri/import-export';
import type {
  ImportPreviewData,
  ImportResult,
  ExportResult,
  ImportHistoryItem,
  ColumnMapping,
} from '@/services/tauri/import-export';
import type { RootState } from '../store';

// State interface
interface ImportExportState {
  // Import preview
  preview: ImportPreviewData | null;
  previewLoading: boolean;
  previewError: string | null;

  // Import execution
  importResult: ImportResult | null;
  importLoading: boolean;
  importError: string | null;
  importProgress: number;

  // Column mappings
  columnMappings: Record<string, string>;
  
  // Export
  exportResult: ExportResult | null;
  exportLoading: boolean;
  exportError: string | null;
  exportProgress: number;

  // History
  importHistory: ImportHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;

  // Import configuration
  importConfig: {
    conflictResolution: 'ask' | 'update' | 'skip' | 'error';
    autoCreateCategories: boolean;
    batchSize: number;
  };
}

// Initial state
const initialState: ImportExportState = {
  preview: null,
  previewLoading: false,
  previewError: null,

  importResult: null,
  importLoading: false,
  importError: null,
  importProgress: 0,

  columnMappings: {},
  
  exportResult: null,
  exportLoading: false,
  exportError: null,
  exportProgress: 0,

  importHistory: [],
  historyLoading: false,
  historyError: null,

  importConfig: {
    conflictResolution: 'ask',
    autoCreateCategories: true,
    batchSize: 500,
  },
};

// Async thunks
export const previewImport = createAsyncThunk(
  'importExport/previewImport',
  async (
    payload: { filePath: string; importType: string; sheetName?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await importExportService.previewImport(
        payload.filePath,
        payload.importType,
        payload.sheetName
      );
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to preview import');
    }
  }
);

export const executeImport = createAsyncThunk(
  'importExport/executeImport',
  async (
    payload: {
      filePath: string;
      importType: string;
      columnMappings: Record<string, string>;
      conflictResolution: string;
      autoCreateCategories: boolean;
      sheetName?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await importExportService.executeImport(
        payload.filePath,
        payload.importType,
        payload.columnMappings,
        payload.conflictResolution,
        payload.autoCreateCategories,
        payload.sheetName
      );
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to execute import');
    }
  }
);

export const exportData = createAsyncThunk(
  'importExport/exportData',
  async (
    payload: {
      exportType: string;
      format: string;
      destinationPath: string;
      filters?: {
        category_id?: number;
        search?: string;
        is_active?: boolean;
        low_stock_only?: boolean;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await importExportService.exportData(
        payload.exportType,
        payload.format,
        payload.destinationPath,
        payload.filters
      );
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to export data');
    }
  }
);

export const fetchImportHistory = createAsyncThunk(
  'importExport/fetchImportHistory',
  async (
    payload: { importType?: string; skip?: number; limit?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const result = await importExportService.getImportHistory(
        payload?.importType,
        payload?.skip,
        payload?.limit
      );
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch import history');
    }
  }
);

export const fetchImportErrors = createAsyncThunk(
  'importExport/fetchImportErrors',
  async (importId: number, { rejectWithValue }) => {
    try {
      const result = await importExportService.getImportErrors(importId);
      return { importId, errors: result };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch import errors');
    }
  }
);

// Slice
const importExportSlice = createSlice({
  name: 'importExport',
  initialState,
  reducers: {
    clearPreview: (state) => {
      state.preview = null;
      state.previewError = null;
      state.columnMappings = {};
    },
    clearImportResult: (state) => {
      state.importResult = null;
      state.importError = null;
      state.importProgress = 0;
    },
    clearExportResult: (state) => {
      state.exportResult = null;
      state.exportError = null;
      state.exportProgress = 0;
    },
    setColumnMapping: (state, action: PayloadAction<{ sourceColumn: string; targetField: string }>) => {
      state.columnMappings[action.payload.sourceColumn] = action.payload.targetField;
    },
    setConflictResolution: (state, action: PayloadAction<'ask' | 'update' | 'skip' | 'error'>) => {
      state.importConfig.conflictResolution = action.payload;
    },
    setAutoCreateCategories: (state, action: PayloadAction<boolean>) => {
      state.importConfig.autoCreateCategories = action.payload;
    },
    setBatchSize: (state, action: PayloadAction<number>) => {
      state.importConfig.batchSize = action.payload;
    },
    updateImportProgress: (state, action: PayloadAction<number>) => {
      state.importProgress = action.payload;
    },
    updateExportProgress: (state, action: PayloadAction<number>) => {
      state.exportProgress = action.payload;
    },
    resetImportExport: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Preview import
      .addCase(previewImport.pending, (state) => {
        state.previewLoading = true;
        state.previewError = null;
      })
      .addCase(previewImport.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.preview = action.payload;
        
        // Auto-populate column mappings from detected columns
        const autoMappings: Record<string, string> = {};
        action.payload.detected_columns.forEach((col: ColumnMapping) => {
          if (col.is_mapped && col.target_field) {
            autoMappings[col.source_column] = col.target_field;
          }
        });
        state.columnMappings = autoMappings;
      })
      .addCase(previewImport.rejected, (state, action) => {
        state.previewLoading = false;
        state.previewError = action.payload as string;
      })
      
      // Execute import
      .addCase(executeImport.pending, (state) => {
        state.importLoading = true;
        state.importError = null;
        state.importProgress = 0;
      })
      .addCase(executeImport.fulfilled, (state, action) => {
        state.importLoading = false;
        state.importResult = action.payload;
        state.importProgress = 100;
      })
      .addCase(executeImport.rejected, (state, action) => {
        state.importLoading = false;
        state.importError = action.payload as string;
      })
      
      // Export data
      .addCase(exportData.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
        state.exportProgress = 0;
      })
      .addCase(exportData.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportResult = action.payload;
        state.exportProgress = 100;
      })
      .addCase(exportData.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload as string;
      })
      
      // Fetch import history
      .addCase(fetchImportHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchImportHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.importHistory = action.payload;
      })
      .addCase(fetchImportHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload as string;
      });
  },
});

// Actions
export const {
  clearPreview,
  clearImportResult,
  clearExportResult,
  setColumnMapping,
  setConflictResolution,
  setAutoCreateCategories,
  setBatchSize,
  updateImportProgress,
  updateExportProgress,
  resetImportExport,
} = importExportSlice.actions;

// Selectors
export const selectImportExportState = (state: RootState) => state.importExport;
export const selectImportPreview = (state: RootState) => state.importExport.preview;
export const selectPreviewLoading = (state: RootState) => state.importExport.previewLoading;
export const selectPreviewError = (state: RootState) => state.importExport.previewError;
export const selectImportResult = (state: RootState) => state.importExport.importResult;
export const selectImportLoading = (state: RootState) => state.importExport.importLoading;
export const selectImportError = (state: RootState) => state.importExport.importError;
export const selectImportProgress = (state: RootState) => state.importExport.importProgress;
export const selectColumnMappings = (state: RootState) => state.importExport.columnMappings;
export const selectExportResult = (state: RootState) => state.importExport.exportResult;
export const selectExportLoading = (state: RootState) => state.importExport.exportLoading;
export const selectExportError = (state: RootState) => state.importExport.exportError;
export const selectExportProgress = (state: RootState) => state.importExport.exportProgress;
export const selectImportHistory = (state: RootState) => state.importExport.importHistory;
export const selectHistoryLoading = (state: RootState) => state.importExport.historyLoading;
export const selectHistoryError = (state: RootState) => state.importExport.historyError;
export const selectImportConfig = (state: RootState) => state.importExport.importConfig;

export default importExportSlice.reducer;
