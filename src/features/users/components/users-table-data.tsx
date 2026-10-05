import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUsersTableData } from '@/services/user.service'
import type { DataTableQuery } from '@/hooks/use-data-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { usersColumns } from '@/features/users/components/users-columns'
import { UserTable } from '@/features/users/components/users-table'
import type { UserResponse as User } from '@chat-crm/contracts'

export const UserTableData = () => {
  const columns = usersColumns()

  const [query, setQuery] = useState<DataTableQuery<User>>({
    page: 1,
    perPage: 10,
    sort: [],
  })

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['users', 'table', query],
    queryFn: () => getUsersTableData(query),
    placeholderData: (prev) => prev,
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const pageCount = data?.meta?.totalPages ?? -1
  const showSkeleton = isPending || (isFetching && items.length === 0)

  if (showSkeleton) {
    return (
      <DataTableSkeleton
        columnCount={columns.length}
        filterCount={2}
        cellWidths={Array(columns.length).fill('2rem')}
        shrinkZero
      />
    )
  }

  return (
    <UserTable
      users={items}
      columns={columns}
      pageCount={pageCount}
      onQueryChange={setQuery}
    />
  )
}
