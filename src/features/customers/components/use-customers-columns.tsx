import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { CustomerRow } from '@chat-crm/contracts'
import { Ellipsis, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Chip,
  IdentityCell,
  RelativeTime,
  RowActions,
} from '@/components/data-grid'
import { SOURCE_LABEL, copy } from '../copy'
import { avatarName, customerName } from '../customers-data'
import {
  OpenConversationLink,
  OwnerLabel,
  StageLabel,
  TagList,
} from './customers-columns'

export type CustomersColumnsContext = {
  /** Admin and supervisor: select column and delete actions. */
  canSupervise: boolean
  onOpen: (customer: CustomerRow) => void
  onEdit: (customer: CustomerRow) => void
  onRemove: (customer: CustomerRow) => void
}

export function useCustomersColumns({
  canSupervise,
  onOpen,
  onEdit,
  onRemove,
}: CustomersColumnsContext) {
  return useMemo<ColumnDef<CustomerRow>[]>(() => {
    const select: ColumnDef<CustomerRow>[] = canSupervise
      ? [
          {
            id: 'select',
            size: 44,
            enableSorting: false,
            header: ({ table }) => (
              <div data-no-row-click>
                <Checkbox
                  aria-label={copy.selectAll}
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(Boolean(value))
                  }
                />
              </div>
            ),
            cell: ({ row }) => (
              <div data-no-row-click>
                <Checkbox
                  aria-label={copy.selectOne(customerName(row.original))}
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                />
              </div>
            ),
          },
        ]
      : []

    return [
      ...select,
      {
        id: 'displayName',
        accessorFn: (customer) => customerName(customer),
        header: copy.columns.customer,
        size: 260,
        cell: ({ row }) => {
          const customer = row.original
          const name = customerName(customer)
          return (
            <IdentityCell
              tintKey={customer.id}
              name={avatarName(customer)}
              fallback={customer.phoneNumber}
              src={customer.avatarUrl}
              title={name}
              subtitle={name === customer.phoneNumber ? null : customer.phoneNumber}
            />
          )
        },
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: copy.columns.email,
        size: 210,
        cell: ({ row }) =>
          row.original.email ? (
            <span className='block max-w-[14rem] truncate text-sm'>
              {row.original.email}
            </span>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        id: 'tags',
        header: copy.columns.tags,
        size: 220,
        enableSorting: false,
        cell: ({ row }) => <TagList tags={row.original.tags} />,
      },
      {
        id: 'stage',
        accessorFn: (customer) => customer.stage?.name,
        header: copy.columns.stage,
        size: 150,
        cell: ({ row }) => <StageLabel stage={row.original.stage} />,
      },
      {
        id: 'owner',
        header: copy.columns.owner,
        size: 180,
        enableSorting: false,
        cell: ({ row }) => <OwnerLabel owner={row.original.owner} />,
      },
      {
        id: 'lastInteractionAt',
        accessorKey: 'lastInteractionAt',
        header: copy.columns.lastInteraction,
        size: 160,
        cell: ({ row }) => (
          <RelativeTime
            date={row.original.lastInteractionAt}
            empty={copy.noContact}
          />
        ),
      },
      {
        id: 'conversationsCount',
        accessorKey: 'conversationsCount',
        header: copy.columns.conversations,
        size: 170,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span className='text-sm tabular-nums'>
              {row.original.conversationsCount}
            </span>
            <OpenConversationLink customer={row.original} />
          </div>
        ),
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: copy.columns.source,
        size: 120,
        cell: ({ row }) => <Chip>{SOURCE_LABEL[row.original.source]}</Chip>,
      },
      {
        id: 'actions',
        size: 56,
        enableSorting: false,
        header: () => <span className='sr-only'>Acciones</span>,
        cell: ({ row }) => {
          const customer = row.original
          return (
            <RowActions>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label={copy.actionsLabel(customerName(customer))}
                  >
                    <Ellipsis className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                  <DropdownMenuItem onSelect={() => onOpen(customer)}>
                    <Eye />
                    {copy.menu.open}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(customer)}>
                    <Pencil />
                    {copy.menu.edit}
                  </DropdownMenuItem>
                  {canSupervise ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant='destructive'
                        onSelect={() => onRemove(customer)}
                      >
                        <Trash2 />
                        {copy.menu.remove}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </RowActions>
          )
        },
      },
    ]
  }, [canSupervise, onOpen, onEdit, onRemove])
}
