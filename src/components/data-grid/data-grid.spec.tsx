import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BulkBar } from './bulk-bar'
import { relativeTime } from './format'
import { DataGrid } from './data-grid'
import { DataGridPagination } from './data-grid-pagination'
import { DataGridToolbar } from './data-grid-toolbar'

type Person = { id: string; name: string }
const people: Person[] = [
  { id: '1', name: 'Ana Quispe' },
  { id: '2', name: 'Luis Paredes' },
]

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Nombre', accessorKey: 'name' },
  {
    id: 'actions',
    header: 'Acciones',
    enableSorting: false,
    cell: () => <button type='button'>Editar</button>,
  },
]

type HarnessProps = Partial<React.ComponentProps<typeof DataGrid<Person>>> & {
  data?: Person[]
}

function Harness({ data = people, ...props }: HarnessProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })
  return (
    <DataGrid
      table={table}
      emptyState={<p>Aún no hay nadie</p>}
      {...props}
    />
  )
}

afterEach(() => vi.useRealTimers())

describe('DataGrid', () => {
  it('renders one row per item under quiet column headers', () => {
    render(<Harness />)

    expect(screen.getByRole('columnheader', { name: /nombre/i })).toBeVisible()
    expect(screen.getByText('Ana Quispe')).toBeVisible()
    expect(screen.getByText('Luis Paredes')).toBeVisible()
  })

  it('shows skeleton rows instead of data on first load', () => {
    render(<Harness isLoading />)

    expect(screen.queryByText('Ana Quispe')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('tells "no data" apart from "no results for these filters"', async () => {
    const onClear = vi.fn()
    const { rerender } = render(<Harness data={[]} />)
    expect(screen.getByText('Aún no hay nadie')).toBeVisible()

    rerender(<Harness data={[]} isFiltered onClearFilters={onClear} />)
    expect(screen.queryByText('Aún no hay nadie')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('opens a row on click and on Enter, but not from its own buttons', async () => {
    const onRowClick = vi.fn()
    render(
      <Harness onRowClick={onRowClick} getRowLabel={(r) => r.original.name} />
    )

    await userEvent.click(screen.getByText('Ana Quispe'))
    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick.mock.calls[0][0].original.id).toBe('1')

    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    expect(onRowClick).toHaveBeenCalledTimes(1)

    const row = screen.getByRole('row', { name: 'Abrir Luis Paredes' })
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('sorts from the header button and exposes aria-sort', async () => {
    render(<Harness />)
    const header = screen.getByRole('columnheader', { name: /nombre/i })

    await userEvent.click(screen.getByRole('button', { name: /nombre/i }))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: /nombre/i }))
    expect(header).toHaveAttribute('aria-sort', 'descending')
  })
})

describe('DataGridToolbar', () => {
  const baseProps = {
    search: '',
    searchPlaceholder: 'Buscar',
    onSearchChange: vi.fn(),
  }

  it('debounces typing so the query only changes when the person pauses', () => {
    vi.useFakeTimers()
    const onSearchChange = vi.fn()
    render(
      <DataGridToolbar {...baseProps} onSearchChange={onSearchChange} />
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'an' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ana' } })
    vi.advanceTimersByTime(200)
    expect(onSearchChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('ana')
  })

  it('focuses the search with "/" unless the person is already typing', async () => {
    render(
      <>
        <input aria-label='otro' />
        <DataGridToolbar {...baseProps} />
      </>
    )

    await userEvent.keyboard('/')
    expect(screen.getByRole('searchbox')).toHaveFocus()

    screen.getByLabelText('otro').focus()
    await userEvent.keyboard('/')
    expect(screen.getByLabelText('otro')).toHaveFocus()
  })

  it('lists applied filters as removable chips and can clear them all', async () => {
    const remove = vi.fn()
    const reset = vi.fn()
    render(
      <DataGridToolbar
        {...baseProps}
        activeFilters={[
          { key: 'a', label: 'Agente', onRemove: remove },
          { key: 'b', label: 'Activo', onRemove: vi.fn() },
        ]}
        onReset={reset}
        summary='2 miembros'
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar filtro Agente' })
    )
    expect(remove).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar todos' }))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(screen.getByText('2 miembros')).toBeVisible()
  })
})

describe('DataGridPagination', () => {
  it('shows the visible range and disables previous on the first page', async () => {
    const onPageChange = vi.fn()
    render(
      <DataGridPagination
        page={1}
        pageSize={10}
        total={42}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />
    )

    expect(screen.getByText('1–10 de 42')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Página siguiente' })
    )
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('clamps the last page range and says so when empty', () => {
    const { rerender } = render(
      <DataGridPagination
        page={5}
        pageSize={10}
        total={42}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )
    expect(screen.getByText('41–42 de 42')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()

    rerender(
      <DataGridPagination
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Sin resultados')).toBeVisible()
  })
})

describe('BulkBar', () => {
  it('renders nothing without a selection and pluralizes with one', async () => {
    const onClear = vi.fn()
    const { rerender } = render(
      <BulkBar count={0} noun={['cliente', 'clientes']} onClear={onClear}>
        <button type='button'>Eliminar</button>
      </BulkBar>
    )
    expect(screen.queryByRole('region')).not.toBeInTheDocument()

    rerender(
      <BulkBar count={1} noun={['cliente', 'clientes']} onClear={onClear}>
        <button type='button'>Eliminar</button>
      </BulkBar>
    )
    expect(screen.getByText('1 cliente seleccionado')).toBeVisible()

    rerender(
      <BulkBar count={3} noun={['cliente', 'clientes']} onClear={onClear}>
        <button type='button'>Eliminar</button>
      </BulkBar>
    )
    expect(screen.getByText('3 clientes seleccionados')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar selección' })
    )
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-10-14T12:00:00Z').getTime()

  it('speaks Spanish in the unit that fits', () => {
    expect(relativeTime(now - 10_000, now)).toBe('ahora')
    expect(relativeTime(now - 5 * 3_600_000, now)).toBe('hace 5 horas')
    expect(relativeTime(now - 86_400_000, now)).toBe('ayer')
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('hace 3 días')
  })
})
