import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  previewImport,
  executeImport,
  exportData,
  fetchImportHistory,
  fetchImportErrors,
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
} from '@/redux/slices/importExportSlice';

export function useReduxImportExport() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.importExport);

  return {
    ...state,

    // Thunks
    previewImport: (payload: { filePath: string; importType: string; sheetName?: string }) =>
      dispatch(previewImport(payload)),
    executeImport: (payload: {
      filePath: string;
      importType: string;
      columnMappings: Record<string, string>;
      conflictResolution: string;
      autoCreateCategories: boolean;
      sheetName?: string;
    }) => dispatch(executeImport(payload)),
    exportData: (payload: {
      exportType: string;
      format: string;
      destinationPath: string;
      filters?: {
        category_id?: number;
        search?: string;
        is_active?: boolean;
        low_stock_only?: boolean;
      };
    }) => dispatch(exportData(payload)),
    fetchImportHistory: (payload?: { importType?: string; skip?: number; limit?: number }) =>
      dispatch(fetchImportHistory(payload)),
    fetchImportErrors: (importId: number) => dispatch(fetchImportErrors(importId)),

    // Actions
    clearPreview: () => dispatch(clearPreview()),
    clearImportResult: () => dispatch(clearImportResult()),
    clearExportResult: () => dispatch(clearExportResult()),
    setColumnMapping: (sourceColumn: string, targetField: string) =>
      dispatch(setColumnMapping({ sourceColumn, targetField })),
    setConflictResolution: (resolution: 'ask' | 'update' | 'skip' | 'error') =>
      dispatch(setConflictResolution(resolution)),
    setAutoCreateCategories: (auto: boolean) =>
      dispatch(setAutoCreateCategories(auto)),
    setBatchSize: (size: number) => dispatch(setBatchSize(size)),
    updateImportProgress: (progress: number) =>
      dispatch(updateImportProgress(progress)),
    updateExportProgress: (progress: number) =>
      dispatch(updateExportProgress(progress)),
    resetImportExport: () => dispatch(resetImportExport()),
  };
}
