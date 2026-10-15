import { flexRender, type Row, type Table } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, SearchX } from 'lucide-react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Elements inside a row that must not trigger the row click. */
const INTERACTIVE =
  '[data-no-row-click],button,a,input,select,textarea,label,[role=checkbox],[role=switch],[role=menuitem]'

export type DataGridProps<TData> = {
  table: Table<TData>
  /** First load: skeleton rows shaped like the real ones. */
  isLoading?: boolean
  /** Refetching with data on screen: a thin progress line, no dimming. */
  isFetching?: boolean
  /** Shown when the dataset itself is empty (invite to create). */
  emptyState: ReactNode
  /** True when filters/search are active, so "no results" differs from "no data". */
  isFiltered?: boolean
  onClearFilters?: () => void
  onRowClick?: (row: Row<TData>) => void
  /** Accessible name of a row for the click target, e.g. the person's name. */
  getRowLabel?: (row: Row<TData>) => string
  /** Below `md` the table is replaced by this stacked rendering. */
  mobileRow?: (row: Row<TData>) => ReactNode
  /** Number of skeleton rows (defaults to the current page size). */
  skeletonRows?: number
  className?: string
}

/**
 * Server-driven people table. A row is a ledger line: hairline separators, an
 * inset primary mark on hover/selection, quiet sentence-case headers and
 * actions that appear on hover. State handling (loading, refetching, empty vs
 * filtered-empty) lives here so every screen behaves the same.
 */
export function DataGrid<TData>({
  table,
  isLoading,
  isFetching,
  emptyState,
  isFiltered,
  onClearFilters,
  onRowClick,
  getRowLabel,
  mobileRow,
  skeletonRows,
  className,
}: DataGridProps<TData>) {
  const rows = table.getRowModel().rows
  const columns = table.getVisibleLeafColumns()
  const placeholders = skeletonRows ?? table.getState().pagination.pageSize

  const handleRowClick = (event: MouseEvent, row: Row<TData>) => {
    if (!onRowClick) return
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return
    onRowClick(row)
  }

  const handleRowKey = (event: KeyboardEvent, row: Row<TData>) => {
    if (!onRowClick || event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(row)
    }
  }

  const body = isLoading ? null : rows.length === 0 ? (
    <div className='py-16'>
      {isFiltered ? (
        <Empty className='border-0'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nada coincide con estos filtros</EmptyTitle>
            <EmptyDescription>
              Prueba con otra búsqueda o quita algún filtro.
            </EmptyDescription>
          </EmptyHeader>
          {onClearFilters ? (
            <button
              type='button'
              onClick={onClearFilters}
              className='text-primary-foreground bg-primary hover:bg-primary/90 focus-visible:ring-ring h-9 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none'
            >
              Quitar filtros
            </button>
          ) : null}
        </Empty>
      ) : (
        emptyState
      )}
    </div>
  ) : null

  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden={!isFetching || isLoading}
        className={cn(
          'bg-primary absolute inset-x-0 top-0 z-10 h-0.5 origin-left transition-opacity',
          isFetching && !isLoading
            ? 'opacity-100 motion-safe:animate-pulse'
            : 'opacity-0'
        )}
      />

      <div className={cn(mobileRow ? 'hidden md:block' : '', 'overflow-x-auto')}>
        <table className='w-full text-sm' aria-busy={isFetching || isLoading}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className='border-b'>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()
                  const align = header.column.columnDef.meta?.align

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope='col'
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      style={{ width: header.getSize() || undefined }}
                      className={cn(
                        'text-muted-foreground h-11 px-3 text-left align-middle text-[13px] font-medium whitespace-nowrap first:ps-4 last:pe-4',
                        align === 'right' && 'text-right'
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type='button'
                          onClick={header.column.getToggleSortingHandler()}
                          className='hover:text-foreground focus-visible:ring-ring -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 focus-visible:ring-2 focus-visible:outline-none'
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === 'asc' ? (
                            <ArrowUp className='size-3.5' />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className='size-3.5' />
                          ) : (
                            <ChevronsUpDown className='size-3.5 opacity-40' />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: placeholders }, (_, i) => (
                  <tr key={i} className='border-b last:border-0'>
                    {columns.map((column, c) => (
                      <td key={column.id} className='h-16 px-3 first:ps-4 last:pe-4'>
                        {column.id === 'select' ? (
                          <Skeleton className='size-4 rounded' />
                        ) : (
                          <Skeleton
                            className='h-4 rounded'
                            style={{ width: `${55 + ((i * 7 + c * 13) % 35)}%` }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={
                      onRowClick && getRowLabel
                        ? `Abrir ${getRowLabel(row)}`
                        : undefined
                    }
                    onClick={(event) => handleRowClick(event, row)}
                    onKeyDown={(event) => handleRowKey(event, row)}
                    className={cn(
                      'group/row relative border-b transition-colors last:border-0',
                      'hover:bg-muted/40 data-[state=selected]:bg-primary/10',
                      'focus-visible:bg-muted/40 focus-visible:outline-none',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'h-16 px-3 align-middle first:ps-4 last:pe-4',
                          cell.column.columnDef.meta?.align === 'right' &&
                            'text-right',
                          // The inset mark lives on the first cell so the row
                          // keeps its borders and layout untouched.
                          index === 0 &&
                            'group-hover/row:shadow-[inset_2px_0_0_var(--primary)] group-focus-visible/row:shadow-[inset_2px_0_0_var(--primary)] group-data-[state=selected]/row:shadow-[inset_2px_0_0_var(--primary)]'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {body}
      </div>

      {mobileRow ? (
        <ul className='divide-y md:hidden'>
          {isLoading
            ? Array.from({ length: Math.min(placeholders, 6) }, (_, i) => (
                <li key={i} className='flex items-center gap-3 px-4 py-4'>
                  <Skeleton className='size-9 rounded-full' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-4 w-2/3' />
                    <Skeleton className='h-3 w-1/3' />
                  </div>
                </li>
              ))
            : rows.map((row) => <li key={row.id}>{mobileRow(row)}</li>)}
          {!isLoading && rows.length === 0 ? <li>{body}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
