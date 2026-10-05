import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { roles } from '../data/data'
import type { MemberRole, UserResponse } from '@chat-crm/contracts'

// v2: `users` is identity only (no role/status). Columns stay for the
// migration to `company-members`; missing values render a placeholder.
type User = UserResponse & {
  role?: MemberRole
  status?: string
}
import { DataTableRowActions } from './data-table-row-actions'

// Translations
const trnl: Partial<Record<keyof User, string>> = {
  phoneNumber: 'Telefono',
  role: 'Rol',
  firstName: 'Nombres',
  lastName: 'Apellidos',
  username: 'Username',
  email: 'Correo',
  status: 'Estado',
  createdAt: 'Creación',
}

export const usersColumns = (): ColumnDef<User>[] => {
  return useMemo<ColumnDef<User>[]>(
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
            className='translate-y-[2px]'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
            className='translate-y-[2px]'
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 16,
      },
      {
        accessorKey: 'username',
        id: 'username',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Username' />
        ),
        cell: ({ row }) => (
          <LongText className='max-w-36 ps-3'>
            {row.getValue('username')}
          </LongText>
        ),
        enableHiding: false,
        enableColumnFilter: true,
        meta: {
          variant: 'text',
          placeholder: 'Filter for username',
          label: trnl['username'] ?? 'Username',
        },
      },
      {
        accessorKey: 'firstName',
        id: 'firstName',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['firstName'] ?? 'First Names'}
          />
        ),
        cell: ({ cell }) => {
          return (
            <div className='truncate capitalize'>
              {cell.getValue<User['firstName']>() ?? '-'}
            </div>
          )
        },
      },
      {
        accessorKey: 'lastName',
        id: 'lastName',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['lastName'] ?? 'Last Names'}
          />
        ),
        cell: ({ cell }) => (
          <div className='truncate capitalize'>
            {cell.getValue<User['lastName']>() ?? '-'}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        id: 'email',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['email'] ?? 'Email'}
          />
        ),
        cell: ({ cell }) => (
          <div className='w-fit text-nowrap'>
            {cell.getValue<User['email']>() ?? '-'}
          </div>
        ),
        meta: {
          label: trnl['email'] ?? 'Email',
        },
      },
      {
        accessorKey: 'phoneNumber',
        id: 'phoneNumber',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['phoneNumber'] ?? 'phone'}
          />
        ),
        cell: ({ row }) => (
          <div>{row.getValue<User['phoneNumber']>('phoneNumber') ?? '-'}</div>
        ),
        meta: {
          label: trnl['phoneNumber'] ?? 'Phone',
        },
        enableSorting: false,
      },
      {
        accessorKey: 'role',
        id: 'role',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['role'] ?? 'Role'}
          />
        ),
        cell: ({ cell }) => {
          const role = cell.getValue<User['role']>()
          if (!role) return <span className='text-muted-foreground'>-</span>
          const userType = roles[role]

          if (!userType) {
            return null
          }

          return (
            <div className='flex items-center gap-x-2'>
              {userType.icon && (
                <userType.icon size={16} className='text-muted-foreground' />
              )}
              <span className='text-sm capitalize'>{role}</span>
            </div>
          )
        },
        meta: {
          label: trnl['role'] ?? 'Role',
          variant: 'select',
          options: Object.values(roles).map(({ value, label }) => ({
            value,
            label,
          })),
        },
        enableColumnFilter: true,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={trnl['status'] ?? 'Status'}
          />
        ),
        cell: ({ cell }) => {
          const config: Record<string, string> = {
            offline: '🔴 Offline',
            online: '🟢 Online',
            busy: '🟡 Busy',
          }
          const value = cell.getValue<User['status']>()
          if (!value) return <span className='text-muted-foreground'>-</span>
          return config[value] ?? value
        },
        meta: {
          label: trnl['status'] ?? 'Status',
        },
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
