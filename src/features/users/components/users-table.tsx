import type { ColumnDef } from '@tanstack/react-table'
import { useDataTable, type DataTableQuery } from '@/hooks/use-data-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableBulkActions } from '@/features/users/components/data-table-bulk-actions'
import type { UserResponse as User } from '@chat-crm/contracts'

interface UserTableProps {
  users: User[]
  columns: ColumnDef<User>[]
  pageCount: number
  onQueryChange: (query: DataTableQuery<User>) => void
}

export function UserTable({
  users,
  columns,
  pageCount,
  onQueryChange,
}: UserTableProps) {
  const { table } = useDataTable<User>({
    data: users,
    columns,
    pageCount,
    onQueryChange,
  })
  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
      <DataTableBulkActions table={table} />
    </DataTable>
  )
}
