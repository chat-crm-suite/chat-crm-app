import { useMemo } from 'react'
import type { ColumnDef, Column } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { formatPhone } from '@/lib/phone'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/features/contacts/components/data-table-row-actions'
import type { CustomerResponse } from '@chat-crm/contracts'

export const useColumns = (): ColumnDef<CustomerResponse>[] => {
  return useMemo<ColumnDef<CustomerResponse>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'displayName',
        accessorKey: 'displayName',
        header: ({ column }: { column: Column<CustomerResponse, unknown> }) => (
          <DataTableColumnHeader column={column} title='Nombre' />
        ),
        meta: {
          label: 'Nombre',
          placeholder: 'Buscar nombre...',
          variant: 'text',
        },
        enableColumnFilter: true,
      },
      {
        id: 'phoneNumber',
        accessorKey: 'phoneNumber',
        header: ({ column }: { column: Column<CustomerResponse, unknown> }) => (
          <DataTableColumnHeader column={column} title='Telefono' />
        ),
        cell: ({ row }) => {
          const phoneNumber = row.getValue<string | null>('phoneNumber')
          return phoneNumber ? formatPhone(phoneNumber) : '—'
        },
        enableSorting: false,
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: ({ column }: { column: Column<CustomerResponse, unknown> }) => (
          <DataTableColumnHeader column={column} title='Origen' />
        ),
        cell: ({ cell }) => (
          <Badge variant='outline' className='p-1 capitalize'>
            {cell.getValue<CustomerResponse['source']>()}
          </Badge>
        ),
        meta: {
          label: 'Origen',
        },
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: ({ column }: { column: Column<CustomerResponse, unknown> }) => (
          <DataTableColumnHeader column={column} title='Creación' />
        ),
        cell: ({ cell }) =>
          dayjs(cell.getValue<CustomerResponse['createdAt']>())
            .locale('es')
            .format('MMMM D, YYYY'),
      },
      {
        id: 'actions',
        cell: DataTableRowActions,
        size: 16,
      },
    ],
    []
  )
}
