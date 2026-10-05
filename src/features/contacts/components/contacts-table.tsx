import type { ColumnDef } from '@tanstack/react-table'
import { useDataTable, type DataTableQuery } from '@/hooks/use-data-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableBulkActions } from '@/features/contacts/components/data-table-bulk-actions'
import type { CustomerResponse } from '@chat-crm/contracts'

interface ContactTableProps {
  items: CustomerResponse[]
  columns: ColumnDef<CustomerResponse>[]
  pageCount: number
  onQueryChange: (query: DataTableQuery<CustomerResponse>) => void
}

// Responsibility: Pure rendering of the table structure
export function ContactTable({
  items,
  columns,
  pageCount,
  onQueryChange,
}: ContactTableProps) {
  const { table } = useDataTable<CustomerResponse>({
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
