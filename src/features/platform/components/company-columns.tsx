import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { CompanyStatus, PlatformCompanyRow } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import {
  Chip,
  IdentityCell,
  RelativeTime,
  RowActions,
  StatusDot,
  type Tone,
} from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { COMPANIES_COPY, STATUS_LABELS } from '../copy'

export const STATUS_TONE: Record<CompanyStatus, Tone> = {
  active: 'positive',
  inactive: 'neutral',
  suspended: 'warning',
}

type ColumnHandlers = {
  onEdit: (company: PlatformCompanyRow) => void
  onDelete: (company: PlatformCompanyRow) => void
  onRestore: (company: PlatformCompanyRow) => void
  restoringId?: string | null
}

/** Soft-deleted rows are muted so they never read as live companies. */
function Muted({
  company,
  children,
}: {
  company: PlatformCompanyRow
  children: React.ReactNode
}) {
  return <div className={cn(company.deletedAt && 'opacity-60')}>{children}</div>
}

export function CompanyIdentity({ company }: { company: PlatformCompanyRow }) {
  return (
    <IdentityCell
      title={company.name}
      subtitle={company.email || company.phoneNumber || undefined}
      tintKey={company.id}
      name={company.name}
      badge={
        company.deletedAt ? <Chip>{COMPANIES_COPY.deletedBadge}</Chip> : null
      }
    />
  )
}

export function CompanyActions({
  company,
  onEdit,
  onDelete,
  onRestore,
  restoringId,
}: ColumnHandlers & { company: PlatformCompanyRow }) {
  if (company.deletedAt) {
    return (
      <div data-no-row-click className='flex justify-end'>
        <Button
          variant='outline'
          size='sm'
          disabled={restoringId === company.id}
          aria-label={`${COMPANIES_COPY.restore} ${company.name}`}
          onClick={() => onRestore(company)}
        >
          <RotateCcw className='size-4' />
          {COMPANIES_COPY.restore}
        </Button>
      </div>
    )
  }

  return (
    <RowActions>
      <Button
        variant='ghost'
        size='icon'
        className='size-8'
        aria-label={`${COMPANIES_COPY.edit} ${company.name}`}
        onClick={() => onEdit(company)}
      >
        <Pencil className='size-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='text-destructive hover:text-destructive size-8'
        aria-label={`${COMPANIES_COPY.remove} ${company.name}`}
        onClick={() => onDelete(company)}
      >
        <Trash2 className='size-4' />
      </Button>
    </RowActions>
  )
}

export function getCompanyColumns(
  handlers: ColumnHandlers
): ColumnDef<PlatformCompanyRow>[] {
  const count = (id: 'membersCount' | 'customersCount' | 'channelsCount') =>
    ({
      row,
    }: {
      row: { original: PlatformCompanyRow }
    }) => (
      <Muted company={row.original}>
        <span className='text-sm tabular-nums'>{row.original[id]}</span>
      </Muted>
    )

  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: COMPANIES_COPY.columns.company,
      cell: ({ row }) => (
        <Muted company={row.original}>
          <CompanyIdentity company={row.original} />
        </Muted>
      ),
    },
    {
      id: 'status',
      header: COMPANIES_COPY.columns.status,
      enableSorting: false,
      cell: ({ row }) => (
        <Muted company={row.original}>
          <StatusDot tone={STATUS_TONE[row.original.status]}>
            {STATUS_LABELS[row.original.status]}
          </StatusDot>
        </Muted>
      ),
    },
    {
      id: 'members',
      header: COMPANIES_COPY.columns.members,
      enableSorting: false,
      meta: { align: 'right' },
      cell: count('membersCount'),
    },
    {
      id: 'customers',
      header: COMPANIES_COPY.columns.customers,
      enableSorting: false,
      meta: { align: 'right' },
      cell: count('customersCount'),
    },
    {
      id: 'channels',
      header: COMPANIES_COPY.columns.channels,
      enableSorting: false,
      meta: { align: 'right' },
      cell: count('channelsCount'),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: COMPANIES_COPY.columns.created,
      cell: ({ row }) => (
        <Muted company={row.original}>
          <RelativeTime date={row.original.createdAt} />
        </Muted>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Acciones</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <CompanyActions company={row.original} {...handlers} />
      ),
    },
  ]
}
