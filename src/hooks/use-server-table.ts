import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type Table,
  type Updater,
} from '@tanstack/react-table'
import type { PaginationMeta } from '@chat-crm/contracts'

export const SERVER_TABLE_STALE_MS = 30_000

/** URL-backed state shared by every server table. */
export type ServerTableSearch = {
  page?: number
  perPage?: number
  sort?: { id: string; desc: boolean }[]
  q?: string
}

/**
 * The same state with defaults filled in and empty values dropped: this is
 * what the table endpoints receive as the request body (it matches the
 * contracts' `TableQueryBase` plus the screen's own filters).
 */
export type ServerTableParams<TSearch extends ServerTableSearch> = Omit<
  TSearch,
  'page' | 'perPage' | 'sort'
> & {
  page: number
  perPage: number
  sort: { id: string; desc: boolean }[]
}

export type TablePage<TData> = {
  items: TData[]
  meta: PaginationMeta
}

type Options<
  TData,
  TSearch extends ServerTableSearch,
  TResponse extends TablePage<TData>,
> = {
  /** Query key prefix; the normalized params are appended. */
  queryKey: readonly unknown[]
  fetchPage: (params: ServerTableParams<TSearch>) => Promise<TResponse>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  /** Validated search params of the route. */
  search: TSearch
  /** Merges a patch into the URL search params (`undefined` removes a key). */
  onSearchChange: (patch: Partial<TSearch>) => void
  /** Search keys that are filters (cleared by `reset`, counted in `isFiltered`). */
  filterKeys?: readonly (keyof TSearch)[]
  defaultPerPage?: number
  getRowId?: (row: TData) => string
  /** Adds a selection state (cleared whenever the result set changes). */
  enableRowSelection?: boolean
  enabled?: boolean
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

/**
 * TanStack Table in manual mode on top of react-query, driven by the URL.
 *
 * The URL is the source of truth: page, size, sort, search text and filters
 * live in the route's search params, so a refresh, the back button and a
 * shared link all land on the same view. The previous page stays on screen
 * while the next one loads (`isFetching` without `isLoading`), and any change
 * other than the page itself returns to page 1.
 */
export function useServerTable<
  TData,
  TSearch extends ServerTableSearch,
  TResponse extends TablePage<TData> = TablePage<TData>,
>({
  queryKey,
  fetchPage,
  columns,
  search,
  onSearchChange,
  filterKeys = [],
  defaultPerPage = 10,
  getRowId,
  enableRowSelection = false,
  enabled = true,
}: Options<TData, TSearch, TResponse>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const params = useMemo(() => {
    const { page, perPage, sort, ...rest } = search
    const cleaned = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => !isEmpty(value))
    )

    return {
      ...cleaned,
      page: page ?? 1,
      perPage: perPage ?? defaultPerPage,
      sort: sort ?? [],
    } as ServerTableParams<TSearch>
  }, [search, defaultPerPage])

  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchPage(params),
    placeholderData: keepPreviousData,
    staleTime: SERVER_TABLE_STALE_MS,
    enabled,
  })

  const items = useMemo(() => query.data?.items ?? [], [query.data])

  // A different result set invalidates the selection (ids may not exist).
  const selectionScope = JSON.stringify(params)
  useEffect(() => setRowSelection({}), [selectionScope])

  const sorting: SortingState = params.sort
  const pageCount = query.data?.meta.totalPages ?? 1

  const table: Table<TData> = useReactTable({
    data: items,
    columns,
    pageCount,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableRowSelection,
    enableSortingRemoval: true,
    state: {
      sorting,
      rowSelection,
      pagination: { pageIndex: params.page - 1, pageSize: params.perPage },
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSearchChange({
        sort: next.length > 0 ? next : undefined,
        page: undefined,
      } as Partial<TSearch>)
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const setSearchText = useCallback(
    (q: string) =>
      onSearchChange({ q: q.trim() || undefined, page: undefined } as Partial<TSearch>),
    [onSearchChange]
  )

  const setFilter = useCallback(
    <K extends keyof TSearch>(key: K, value: TSearch[K] | undefined) =>
      onSearchChange({
        [key]: isEmpty(value) ? undefined : value,
        page: undefined,
      } as Partial<TSearch>),
    [onSearchChange]
  )

  const setPage = useCallback(
    (page: number) =>
      onSearchChange({ page: page > 1 ? page : undefined } as Partial<TSearch>),
    [onSearchChange]
  )

  const setPageSize = useCallback(
    (perPage: number) =>
      onSearchChange({
        perPage: perPage === defaultPerPage ? undefined : perPage,
        page: undefined,
      } as Partial<TSearch>),
    [onSearchChange, defaultPerPage]
  )

  const reset = useCallback(
    () =>
      onSearchChange({
        q: undefined,
        page: undefined,
        ...Object.fromEntries(filterKeys.map((key) => [key, undefined])),
      } as Partial<TSearch>),
    [onSearchChange, filterKeys]
  )

  const activeFilterCount = filterKeys.filter(
    (key) => !isEmpty(params[key as keyof typeof params])
  ).length
  const isFiltered = activeFilterCount > 0 || !isEmpty(params.q)

  return {
    table,
    /** Rows of the current page (the previous ones while the next loads). */
    items,
    data: query.data,
    meta: query.data?.meta,
    params,
    query,
    /** First load, nothing to show yet: render skeleton rows. */
    isLoading: query.isPending,
    /** Refetching with rows on screen: render the thin progress line. */
    isFetching: query.isFetching && !query.isPending,
    isError: query.isError,
    error: query.error,
    isFiltered,
    activeFilterCount,
    setSearchText,
    setFilter,
    setPage,
    setPageSize,
    reset,
    clearSelection: () => setRowSelection({}),
    selectedIds: Object.keys(rowSelection).filter((id) => rowSelection[id]),
  }
}
