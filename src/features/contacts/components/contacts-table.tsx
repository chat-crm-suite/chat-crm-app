import type { ColumnDef } from '@tanstack/react-table'
import { useDataTable, type DataTableQuery } from '@/hooks/use-data-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableBulkActions } from '@/features/contacts/components/data-table-bulk-actions'
import type { ContactResponse as Contact } from '@chat-crm/contracts'

interface ContactTableProps {
  items: Contact[]
  columns: ColumnDef<Contact>[]
  pageCount: number
  onQueryChange: (query: DataTableQuery<Contact>) => void
}

// Responsibility: Pure rendering of the table structure
export function ContactTable({
  items,
  columns,
  pageCount,
  onQueryChange,
}: ContactTableProps) {
  const { table } = useDataTable<Contact>({
    data: items,
    columns: columns,
    pageCount: pageCount,
    onQueryChange: onQueryChange,
  })

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
      <DataTableBulkActions table={table} />
    </DataTable>
  )
}
