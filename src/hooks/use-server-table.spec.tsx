import { useCallback, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useServerTable, type ServerTableSearch } from './use-server-table'

type Row = { id: string; name: string }
type Search = ServerTableSearch & { role?: string[] }

const meta = (page: number) => ({
  totalItems: 25,
  itemCount: 10,
  itemsPerPage: 10,
  totalPages: 3,
  currentPage: page,
})

function setup(initial: Search = {}) {
  const fetchPage = vi.fn(async (params: { page: number }) => ({
    items: [{ id: `row-${params.page}`, name: `Page ${params.page}` }],
    meta: meta(params.page),
  }))
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const hook = renderHook(
    () => {
      // Stand-in for the router: merge patches, drop undefined keys.
      const [search, setSearch] = useState<Search>(initial)
      const onSearchChange = useCallback((patch: Partial<Search>) => {
        setSearch((prev) => {
          const next = { ...prev, ...patch }
          for (const key of Object.keys(next) as (keyof Search)[]) {
            if (next[key] === undefined) delete next[key]
          }
          return next
        })
      }, [])

      const table = useServerTable<Row, Search>({
        queryKey: ['rows'],
        fetchPage,
        columns: [{ accessorKey: 'name', header: 'Name' }],
        search,
        onSearchChange,
        filterKeys: ['role'],
        getRowId: (row) => row.id,
        enableRowSelection: true,
      })
      return { search, ...table }
    },
    { wrapper }
  )

  return { hook, fetchPage }
}

describe('useServerTable', () => {
  it('requests the normalized params and exposes loading before the first rows', async () => {
    const { hook, fetchPage } = setup({ q: 'ana', role: [] })

    expect(hook.result.current.isLoading).toBe(true)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    // Defaults filled, empty filter dropped.
    expect(fetchPage).toHaveBeenCalledWith({
      q: 'ana',
      page: 1,
      perPage: 10,
      sort: [],
    })
    expect(hook.result.current.table.getRowModel().rows).toHaveLength(1)
  })

  it('keeps the previous page on screen while the next one loads', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.setPage(2))

    // Previous rows still shown, flagged as refetching rather than loading.
    expect(hook.result.current.isLoading).toBe(false)
    expect(hook.result.current.items[0].id).toBe('row-1')
    expect(hook.result.current.isFetching).toBe(true)

    await waitFor(() => expect(hook.result.current.items[0].id).toBe('row-2'))
    expect(hook.result.current.search.page).toBe(2)
  })

  it('returns to page 1 when search text or a filter changes', async () => {
    const { hook } = setup({ page: 3 })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.setFilter('role', ['agent']))
    expect(hook.result.current.search).toEqual({ role: ['agent'] })
    expect(hook.result.current.activeFilterCount).toBe(1)
    expect(hook.result.current.isFiltered).toBe(true)

    act(() => hook.result.current.setPage(3))
    act(() => hook.result.current.setSearchText('  luis '))
    expect(hook.result.current.search).toEqual({ role: ['agent'], q: 'luis' })
  })

  it('keeps the URL clean: empty values and the default size are removed', async () => {
    const { hook } = setup({ q: 'x', role: ['admin'], perPage: 20, page: 2 })
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.setPageSize(10))
    expect(hook.result.current.search.perPage).toBeUndefined()

    act(() => hook.result.current.setFilter('role', []))
    expect(hook.result.current.search.role).toBeUndefined()

    act(() => hook.result.current.reset())
    expect(hook.result.current.search).toEqual({})
    expect(hook.result.current.isFiltered).toBe(false)
  })

  it('writes sorting to the URL and clears the selection when results change', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))

    act(() => hook.result.current.table.getColumn('name')?.toggleSorting(true))
    expect(hook.result.current.search.sort).toEqual([{ id: 'name', desc: true }])

    await waitFor(() => expect(hook.result.current.isFetching).toBe(false))
    act(() => hook.result.current.table.getRow('row-1').toggleSelected(true))
    expect(hook.result.current.selectedIds).toEqual(['row-1'])

    act(() => hook.result.current.setSearchText('otro'))
    await waitFor(() => expect(hook.result.current.selectedIds).toEqual([]))
  })
})
