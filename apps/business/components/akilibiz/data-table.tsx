import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Row,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  Loader2Icon,
  GripVerticalIcon,
  ChevronDownIcon,
  ColumnsIcon,
  SearchIcon,
  XIcon,
  DownloadIcon,
  InfoIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tableLabels: Record<string, string> = {
  "common.search": "Search",
  "common.noResults": "No results.",
  "common.selectAll": "Select all",
  "common.selectRow": "Select row",
  "common.clearSearch": "Clear search",
  "common.refresh": "Refresh",
  "common.columns": "Columns",
  "common.export": "Export",
  "common.rowsPerPage": "Rows per page",
  "common.goToFirstPage": "Go to first page",
  "common.goToPreviousPage": "Go to previous page",
  "common.goToNextPage": "Go to next page",
  "common.goToLastPage": "Go to last page",
};

function t(
  key: string,
  values?: { count?: number; selected?: number; page?: number; total?: number },
) {
  if (key === "common.selectedCount") return `${values?.count ?? 0} selected`;
  if (key === "common.rowsSelected")
    return `${values?.selected ?? 0} of ${values?.total ?? 0} row(s) selected`;
  if (key === "common.pageOf")
    return `Page ${values?.page ?? 0} of ${values?.total ?? 0}`;
  return tableLabels[key] ?? key;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Base type for table data
export interface TableData {
  id: string | number;
  [key: string]: unknown;
}

// Field configuration type
export interface TableField<TData extends TableData> {
  key: keyof TData;
  header: string;
  cell?: (value: TData[keyof TData], row: TData) => React.ReactNode;
  enableHiding?: boolean;
  enableSorting?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

// Action configuration type
export interface TableAction<TData extends TableData> {
  type: "view" | "edit" | "delete" | "custom";
  label?: string;
  icon?: React.ReactNode;
  onClick: (row: TData) => void;
  disabled?: (row: TData) => boolean;
  variant?: "default" | "destructive";
}

// Bulk action configuration
export interface BulkAction<TData extends TableData> {
  label: string;
  icon?: React.ReactNode;
  onClick: (rows: TData[]) => void;
  variant?: "default" | "destructive";
}

// Filter configuration (reserved for future use)
// export interface TableFilter {
//   columnId: string;
//   label: string;
//   options?: { label: string; value: string }[];
// }

// Props for the dynamic table
interface DataTableProps<TData extends TableData> {
  // Data
  data: TData[];
  fields: TableField<TData>[];

  // Header
  title?: string;
  description?: string;
  /** Concise, optional explanation of the table's purpose and displayed data. */
  helpText?: string;

  // Features
  actions?: TableAction<TData>[];
  bulkActions?: BulkAction<TData>[];
  loading?: boolean;

  // Selection
  enableSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;

  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];

  // Sorting & Filtering
  enableSorting?: boolean;
  // enableFiltering?: boolean;  // Reserved for future use
  // filters?: TableFilter[];     // Reserved for future use

  // Search
  enableGlobalSearch?: boolean;
  searchPlaceholder?: string;

  // Drag & Drop
  enableDragDrop?: boolean;
  onReorder?: (newData: TData[]) => void;

  // Column Visibility
  enableColumnVisibility?: boolean;

  // Export
  enableExport?: boolean;
  onExport?: (data: TData[]) => void;

  // Row Actions
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;

  // Toolbar
  toolbarFilters?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  refreshDisabled?: boolean;

  // Customization
  emptyMessage?: string;
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Default action icons
const defaultIcons = {
  view: <EyeIcon className="size-4" />,
  edit: <EditIcon className="size-4" />,
  delete: <TrashIcon className="size-4" />,
} as const;

// Default cell renderers
const defaultCellRenderers = {
  string: (value: string) => <span>{value}</span>,
  number: (value: number) => <span>{value.toLocaleString()}</span>,
  boolean: (value: boolean) => (
    <Badge variant={value ? "default" : "secondary"}>
      {value ? "Yes" : "No"}
    </Badge>
  ),
  date: (value: string | Date) => (
    <span>{new Date(value).toLocaleDateString()}</span>
  ),
} as const;

// Helper function to determine value type and render appropriately
const renderValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === "string") {
    // Check if it's a date string
    if (!isNaN(Date.parse(value)) && value.includes("-")) {
      return defaultCellRenderers.date(value);
    }
    return defaultCellRenderers.string(value);
  }

  if (typeof value === "number") {
    return defaultCellRenderers.number(value);
  }

  if (typeof value === "boolean") {
    return defaultCellRenderers.boolean(value);
  }

  if (value instanceof Date) {
    return defaultCellRenderers.date(value);
  }

  // Fallback for other types
  return <span>{String(value)}</span>;
};

// Helper function to get alignment classes
const getAlignmentClass = (align?: "left" | "center" | "right"): string => {
  switch (align) {
    case "center":
      return "text-center justify-center";
    case "right":
      return "text-right justify-end";
    case "left":
    default:
      return "text-left justify-start";
  }
};

// ============================================================================
// DRAG & DROP COMPONENTS
// ============================================================================

function DragHandle({ id }: { id: number | string }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function DraggableRow<TData extends TableData>({
  row,
  children,
}: {
  row: Row<TData>;
  children: React.ReactNode;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {children}
    </TableRow>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DataTable<TData extends TableData>({
  // Data
  data: initialData,
  fields,

  // Header
  title,
  description,
  helpText,

  // Features
  actions = [],
  bulkActions = [],
  loading = false,

  // Selection
  enableSelection = true,
  onSelectionChange,

  // Pagination
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 30, 40, 50],

  // Sorting & Filtering
  enableSorting = true,
  // enableFiltering = false,  // Reserved for future use
  // filters = [],              // Reserved for future use

  // Search
  enableGlobalSearch = true,
  searchPlaceholder,

  // Drag & Drop
  enableDragDrop = false,
  onReorder,

  // Column Visibility
  enableColumnVisibility = true,

  // Export
  enableExport = false,
  onExport,

  // Row Actions
  onRowClick,
  rowClassName,

  // Toolbar
  toolbarFilters,
  toolbarActions,
  onRefresh,
  refreshing = false,
  refreshDisabled = false,

  // Customization
  emptyMessage,
  className = "",
}: DataTableProps<TData>) {
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.search");
  const resolvedEmptyMessage = emptyMessage ?? t("common.noResults");
  const [data, setData] = React.useState<TData[]>(initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  // Update data when initialData changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Drag & Drop setup
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  // Create a map of field alignments for easy access
  const fieldAlignments = React.useMemo(() => {
    const alignments: Record<string, "left" | "center" | "right"> = {};
    fields.forEach((field) => {
      alignments[field.key as string] = field.align || "left";
    });
    return alignments;
  }, [fields]);

  // Generate columns dynamically based on fields
  const columns = React.useMemo<ColumnDef<TData>[]>(() => {
    const baseColumns: ColumnDef<TData>[] = [];

    // Drag handle column
    if (enableDragDrop) {
      baseColumns.push({
        id: "drag",
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
        enableSorting: false,
        enableHiding: false,
      });
    }

    // Selection column
    if (enableSelection) {
      baseColumns.push({
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label={t("common.selectAll")}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t("common.selectRow")}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      });
    }

    // Data columns
    fields.forEach((field) => {
      const alignment = field.align || "left";

      baseColumns.push({
        accessorKey: field.key as string,
        header: () => {
          return (
            <div className={`flex ${getAlignmentClass(alignment)}`}>
              {field.header}
            </div>
          );
        },
        cell: ({ row }) => {
          const value = row.original[field.key];

          if (field.cell) {
            return (
              <div className={`flex ${getAlignmentClass(alignment)}`}>
                {field.cell(value, row.original)}
              </div>
            );
          }

          return (
            <div className={`flex ${getAlignmentClass(alignment)}`}>
              {renderValue(value)}
            </div>
          );
        },
        enableHiding: field.enableHiding ?? true,
        enableSorting: field.enableSorting ?? enableSorting,
      });
    });

    // Actions column
    if (actions.length > 0) {
      baseColumns.push({
        id: "actions",
        header: () => <div className="flex justify-end"></div>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 justify-end">
            {actions.map((action, index) => {
              const isDestructive =
                action.variant === "destructive" || action.type === "delete";

              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(row.original);
                  }}
                  title={action.label || action.type}
                  className={`size-8 hover:bg-muted ${
                    isDestructive
                      ? "text-destructive hover:text-destructive"
                      : "text-muted-foreground"
                  }`}
                  disabled={
                    action.disabled ? action.disabled(row.original) : false
                  }
                >
                  {action.icon ||
                    defaultIcons[action.type as keyof typeof defaultIcons] || (
                      <MoreVerticalIcon className="size-4" />
                    )}
                </Button>
              );
            })}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      });
    }

    return baseColumns;
  }, [fields, actions, enableSelection, enableDragDrop, enableSorting, t]);

  // The TanStack Table's `useReactTable()` API returns functions that are not safe to memoize.
  // Disable the incompatible-library ESLint check here to avoid the memoization warning.
  /* eslint-disable-next-line react-hooks/incompatible-library */
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination: enablePagination ? pagination : undefined,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: enableSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: enablePagination ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Handle drag end for reordering
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        const newData = arrayMove(data, oldIndex, newIndex);
        onReorder?.(newData);
        return newData;
      });
    }
  }

  // Add selection change handler
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  // Get selected rows
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);
  const hasSelection = selectedRows.length > 0;

  // Handle export
  const handleExport = () => {
    if (onExport) {
      const dataToExport = hasSelection ? selectedRows : data;
      onExport(dataToExport);
    }
  };

  // Render table content
  const renderTableContent = () => {
    const content = (
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[#FAFAFA] dark:bg-[#00000040]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const fieldKey = header.column.id;
                const alignment = fieldAlignments[fieldKey] || "left";

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={getAlignmentClass(alignment)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="flex items-center justify-center">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const cellContent = row.getVisibleCells().map((cell) => {
                const fieldKey = cell.column.id;
                const alignment = fieldAlignments[fieldKey] || "left";

                return (
                  <TableCell
                    key={cell.id}
                    className={`py-4 ${getAlignmentClass(alignment)}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              });

              if (enableDragDrop) {
                return (
                  <DraggableRow key={row.id} row={row}>
                    {cellContent}
                  </DraggableRow>
                );
              }

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`
                    ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    ${rowClassName ? rowClassName(row.original) : ""}
                  `}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {cellContent}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {resolvedEmptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );

    if (enableDragDrop) {
      return (
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <SortableContext
            items={dataIds}
            strategy={verticalListSortingStrategy}
          >
            {content}
          </SortableContext>
        </DndContext>
      );
    }

    return content;
  };

  return (
    <div className={`flex w-full min-w-0 flex-col gap-6 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 items-start justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2">
            {title && (
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="min-w-0 break-words text-2xl font-bold tracking-tight">
                  {title}
                </h2>
                {helpText && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        aria-label={`About ${title}`}
                      >
                        <InfoIcon className="size-4" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={6}
                      className="max-w-xs"
                    >
                      {helpText}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            {description && (
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left side - Search and Filters */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {enableGlobalSearch && (
              <div className="relative w-full min-w-0 lg:w-md lg:max-w-lg">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={resolvedSearchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 pr-9"
                />
                {globalFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => setGlobalFilter("")}
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">{t("common.clearSearch")}</span>
                  </Button>
                )}
              </div>
            )}

            {toolbarFilters}

            {/* Bulk Actions */}
            {hasSelection && bulkActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("common.selectedCount", { count: selectedRows.length })}
                </span>
                {bulkActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "outline"}
                    size="lg"
                    onClick={() => action.onClick(selectedRows)}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Toolbar Actions, Column visibility, and Export */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* Custom Toolbar Actions */}
            {toolbarActions}

            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void onRefresh()}
                    disabled={loading || refreshing || refreshDisabled}
                    aria-label={t("common.refresh")}
                  >
                    <RefreshCwIcon
                      className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.refresh")}</TooltipContent>
              </Tooltip>
            )}

            {/* Column Visibility Dropdown */}
            {enableColumnVisibility && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        aria-label={t("common.columns")}
                      >
                        <ColumnsIcon className="size-4" />
                        <span className="hidden lg:inline">
                          {t("common.columns")}
                        </span>
                        <ChevronDownIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{t("common.columns")}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide(),
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Export Button */}
            {enableExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    aria-label={t("common.export")}
                  >
                    <DownloadIcon className="size-4" />
                    <span className="hidden lg:inline">
                      {t("common.export")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.export")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative flex min-w-0 flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {renderTableContent()}
        </div>

        {/* Pagination */}
        {enablePagination && !loading && (
          <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
              {t("common.rowsSelected", {
                selected: table.getFilteredSelectedRowModel().rows.length,
                total: table.getFilteredRowModel().rows.length,
              })}
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  {t("common.rowsPerPage")}
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="w-20" id="rows-per-page">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                {t("common.pageOf", {
                  page: table.getState().pagination.pageIndex + 1,
                  total: table.getPageCount(),
                })}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">{t("common.goToFirstPage")}</span>
                  <ChevronsLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">
                    {t("common.goToPreviousPage")}
                  </span>
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">{t("common.goToNextPage")}</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">{t("common.goToLastPage")}</span>
                  <ChevronsRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
