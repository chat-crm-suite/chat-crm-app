import type { ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import type { ContactResponse as Contact } from '@chat-crm/contracts'

export const ContactTableSkeleton = ({
  columns,
}: {
  columns: ColumnDef<Contact>[]
}) => (
  <DataTableSkeleton
    columnCount={columns.length}
    filterCount={2}
    cellWidths={Array(columns.length).fill('2rem')}
    shrinkZero
  />
)
