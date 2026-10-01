import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { ExtendedColumnSort } from "@/types/data-table";

const DEBOUNCE_MS = 500;
const isDevelopment = import.meta.env.DEV;

export interface DataTableQuery<TData> {
  page: number;
  perPage: number;
  sort: ExtendedColumnSort<TData>[];
}

interface DataTableState<TData> {
  page: number;
  perPage: number;
  sort: SortingState;
  columnFilters: ColumnFiltersState;
  _marker?: TData;
}

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state"
    | "pageCount"
    | "getCoreRowModel"
    | "manualFiltering"
    | "manualPagination"
    | "manualSorting"
  >,
  Required<Pick<TableOptions<TData>, "pageCount">> {

  onQueryChange: (query: DataTableQuery<TData>) => void;
  initialState?: Omit<Partial<TableState>, "sorting" | "columnFilters"> & {
    sorting?: ExtendedColumnSort<TData>[];
    columnFilters?: ColumnFiltersState;
  };
  debounceMs?: number;
}

export function useDataTable<TData extends object>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    onQueryChange,
    debounceMs = DEBOUNCE_MS,
    ...tableProps
  } = props;

  const [queryState, setQueryState] = React.useState<DataTableState<TData>>({
    page: initialState?.pagination?.pageIndex ? initialState.pagination.pageIndex + 1 : 1,
    perPage: initialState?.pagination?.pageSize ?? 10,
    sort: initialState?.sorting ?? [],
    columnFilters: initialState?.columnFilters ?? [],
  });

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  const pagination: PaginationState = React.useMemo(() => ({
    pageIndex: queryState.page - 1,
    pageSize: queryState.perPage,
  }), [queryState.page, queryState.perPage]);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      setQueryState(prev => {
        const newPagination = typeof updaterOrValue === "function"
          ? updaterOrValue(pagination)
          : updaterOrValue;
        return {
          ...prev,
          page: newPagination.pageIndex + 1,
          perPage: newPagination.pageSize,
        };
      });
    },
    [pagination],
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      setQueryState(prev => ({
        ...prev,
        sort: typeof updaterOrValue === "function" ? updaterOrValue(prev.sort) : updaterOrValue,
      }));
    },
    [],
  );

  const debouncedSetColumnFilters = useDebouncedCallback(
    (nextFilters: ColumnFiltersState) => {
      setQueryState(prev => ({
        ...prev,
        columnFilters: nextFilters,

      }));
    },
    debounceMs,
  );

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      const nextFilters = typeof updaterOrValue === "function"
        ? updaterOrValue(queryState.columnFilters)
        : updaterOrValue;
      debouncedSetColumnFilters(nextFilters);
    },
    [queryState.columnFilters, debouncedSetColumnFilters],
  );

  React.useEffect(() => {
    const filters: Record<string, unknown> = queryState.columnFilters.reduce(
      (acc, filter) => {
        if (filter.value !== null && filter.value !== undefined) {
          acc[filter.id] = filter.value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const finalQuery: DataTableQuery<TData> = {
      page: queryState.page,
      perPage: queryState.perPage,
      sort: queryState.sort as ExtendedColumnSort<TData>[],
      ...filters,
    };
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log("[DEV MODE] POST Query Body:", finalQuery);
    }

    onQueryChange(finalQuery);
  }, [queryState.page, queryState.perPage, queryState.sort, queryState.columnFilters, onQueryChange]);

  const table = useReactTable({
    ...tableProps,
    columns,
    pageCount,
    state: {
      pagination,
      columnVisibility,
      rowSelection,
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  return { table, finalQuery: table.getState() };
}