import { useMemo } from 'react'
import type { ColumnDef, Column } from '@tanstack/react-table'
import dayjs from 'dayjs'
import {
  Ban,
  CircleDashed,
  CircleDot,
  CirclePlus,
  type LucideIcon,
} from 'lucide-react'
import { formatPhone } from '@/lib/phone'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/features/contacts/components/data-table-row-actions'
import type { ContactResponse as Contact, ContactStatus } from '@chat-crm/contracts'

export const useColumns = (): ColumnDef<Contact>[] => {
  return useMemo<ColumnDef<Contact>[]>(
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
        id: 'username',
        accessorKey: 'username',
        header: ({ column }: { column: Column<Contact, unknown> }) => (
          <DataTableColumnHeader column={column} title='Username' />
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
        header: ({ column }: { column: Column<Contact, unknown> }) => (
          <DataTableColumnHeader column={column} title='Telefono' />
        ),
        cell: ({ row }) => formatPhone(row.getValue('phoneNumber')),
        enableSorting: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Contact, unknown> }) => (
          <DataTableColumnHeader column={column} title='Estado' />
        ),
        cell: ({ cell }) => {
          const icons: Record<ContactStatus, LucideIcon> = {
            new: CirclePlus,
            prospect: CircleDot,
            lead: CircleDashed,
            client: Ban,
          }
          const status = cell.getValue<Contact['status']>()
          const Icon = icons[status]
          return (
            <Badge variant='outline' className='p-1 capitalize'>
              {Icon && <Icon />}
              {status}
            </Badge>
          )
        },
        meta: {
          label: 'Estado',
          variant: 'multiSelect',
          options: [
            { label: 'Nuevo', value: 'new' },
            { label: 'Activo', value: 'active' },
            { label: 'Inactivo', value: 'inactive' },
            { label: 'Bloqueado', value: 'blocked' },
          ],
        },
        enableColumnFilter: true,
        enableSorting: false,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: ({ column }: { column: Column<Contact, unknown> }) => (
          <DataTableColumnHeader column={column} title='Creación' />
        ),
        cell: ({ cell }) =>
          dayjs(cell.getValue<Contact['createdAt']>())
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
