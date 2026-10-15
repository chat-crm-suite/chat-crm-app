'use client'

import * as React from 'react'
import type { Column, Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableDateFilter } from '@/components/data-table/data-table-date-filter'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTableSliderFilter } from '@/components/data-table/data-table-slider-filter'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'

const DEBOUNCE_MS = 500

interface DataTableToolbarProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table]
  )

  const onReset = React.useCallback(() => {
    table.resetColumnFilters()
  }, [table])

  return (
    <div
      role='toolbar'
      aria-orientation='horizontal'
      className={cn(
        'flex w-full items-start justify-between gap-2 p-1',
        className
      )}
      {...props}
    >
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button
            aria-label='Reset filters'
            variant='outline'
            size='sm'
            className='border-dashed'
            onClick={onReset}
          >
            <X />
            Reset
          </Button>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>
}

function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta

  if (!columnMeta?.variant) return null

  switch (columnMeta.variant) {
    case 'text':
      return <DataTableTextFilter column={column} />
    case 'number':
      return <DataTableNumberFilter column={column} />
    case 'range':
      return (
        <DataTableSliderFilter
          column={column}
          title={columnMeta.label ?? column.id}
        />
      )
    case 'date':
    case 'dateRange':
      return (
        <DataTableDateFilter
          column={column}
          title={columnMeta.label ?? column.id}
          multiple={columnMeta.variant === 'dateRange'}
        />
      )
    case 'select':
    case 'multiSelect':
      return (
        <DataTableFacetedFilter
          column={column}
          title={columnMeta.label ?? column.id}
          options={columnMeta.options ?? []}
          multiple={columnMeta.variant === 'multiSelect'}
        />
      )
    default:
      return null
  }
}

/** Debounced text filter: keeps a local value, pushes it to the column. */
function DataTableTextFilter<TData>({ column }: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta
  const globalFilterValue = (column.getFilterValue() as string) ?? ''
  const [localValue, setLocalValue] = React.useState(globalFilterValue)

  const applyGlobalFilter = useDebouncedCallback((value: string) => {
    column.setFilterValue(value || undefined)
  }, DEBOUNCE_MS)

  React.useEffect(() => {
    applyGlobalFilter(localValue)
  }, [localValue, applyGlobalFilter])

  React.useEffect(() => {
    if (globalFilterValue !== localValue) {
      setLocalValue(globalFilterValue)
    }
  }, [globalFilterValue])

  return (
    <Input
      placeholder={columnMeta?.placeholder ?? columnMeta?.label}
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      className='h-8 w-40 lg:w-56'
    />
  )
}

/** Debounced numeric filter with an optional unit suffix. */
function DataTableNumberFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta
  const globalFilterValue = (column.getFilterValue() as string) ?? ''
  const [localValue, setLocalValue] = React.useState(globalFilterValue)

  const applyGlobalFilter = useDebouncedCallback((value: string) => {
    column.setFilterValue(value || undefined)
  }, DEBOUNCE_MS)

  React.useEffect(() => {
    applyGlobalFilter(localValue)
  }, [localValue, applyGlobalFilter])

  React.useEffect(() => {
    if (globalFilterValue !== localValue) {
      setLocalValue(globalFilterValue)
    }
  }, [globalFilterValue])

  return (
    <div className='relative'>
      <Input
        type='number'
        inputMode='numeric'
        placeholder={columnMeta?.placeholder ?? columnMeta?.label}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        className={cn('h-8 w-[120px]', columnMeta?.unit && 'pr-8')}
      />
      {columnMeta?.unit && (
        <span className='bg-accent text-muted-foreground absolute top-0 right-0 bottom-0 flex items-center rounded-r-md px-2 text-sm'>
          {columnMeta.unit}
        </span>
      )}
    </div>
  )
}
