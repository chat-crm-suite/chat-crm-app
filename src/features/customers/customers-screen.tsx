import { useCallback, useMemo, useState } from 'react'
import {
  CUSTOMER_SOURCES,
  NO_OWNER_FILTER,
  type CustomerRow,
  type CustomerSource,
} from '@chat-crm/contracts'
import { Trash2, UserRoundPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useMemberRole } from '@/hooks/use-member-role'
import { useServerTable } from '@/hooks/use-server-table'
import { getCustomersTable } from '@/services/customers.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  BulkBar,
  DataGrid,
  DataGridPagination,
  DataGridToolbar,
  FacetFilter,
  GridEmpty,
  type ActiveFilter,
} from '@/components/data-grid'
import { getApiError } from '../workspace/api-error-code'
import { LoadError } from '../workspace/components/load-error'
import { customerKeys } from '../workspace/query-keys'
import { useWorkspaceSync } from '../workspace/use-workspace-sync'
import { ColorDot } from './components/customers-columns'
import { useCustomersColumns } from './components/use-customers-columns'
import { CustomerDetailSheet } from './components/customer-detail-sheet'
import { CustomerFormSheet } from './components/customer-form-sheet'
import { CustomerMobileRow } from './components/customer-mobile-row'
import { ImportButton } from './components/import-button'
import { SOURCE_LABEL, copy } from './copy'
import {
  customerErrorMessage,
  customerName,
  useBulkDeleteCustomers,
  useCustomerById,
  useDeleteCustomer,
  useOwnerCandidates,
  useStages,
  useTags,
} from './customers-data'
import type { CustomersSearch } from './search'

const FILTER_KEYS = ['stageId', 'ownerMemberId', 'tagId', 'source'] as const

type TableSearch = Omit<CustomersSearch, 'new' | 'customer'>
type Page = Awaited<ReturnType<typeof getCustomersTable>>

type Props = {
  search: CustomersSearch
  onSearchChange: (patch: Partial<CustomersSearch>) => void
}

/**
 * Body of Clientes: header, filters and table, plus the sheets it opens
 * (create, edit, detail) and the delete confirmations. The URL decides what is
 * open (`new`, `customer`), so Ctrl+K and shared links land on the same view.
 */
export function CustomersScreen({ search, onSearchChange }: Props) {
  const { canSupervise } = useMemberRole()
  const companyId = useAuthStore((state) => state.auth.company?.id ?? null)

  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [removing, setRemoving] = useState<CustomerRow | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  useWorkspaceSync()

  const stages = useStages()
  const tags = useTags()
  const owners = useOwnerCandidates('')
  const deleteCustomer = useDeleteCustomer()
  const bulkDelete = useBulkDeleteCustomers()

  const openCustomer = useCallback(
    (customer: CustomerRow) => onSearchChange({ customer: customer.id }),
    [onSearchChange]
  )

  const columns = useCustomersColumns({
    canSupervise,
    onOpen: openCustomer,
    onEdit: setEditing,
    onRemove: setRemoving,
  })

  // `new` and `customer` only open sheets: keep them out of the request.
  const tableSearch = useMemo<TableSearch>(() => {
    const { new: _new, customer: _customer, ...rest } = search
    return rest
  }, [search])

  const grid = useServerTable<CustomerRow, TableSearch, Page>({
    queryKey: [...customerKeys.tables, companyId],
    fetchPage: getCustomersTable,
    columns,
    search: tableSearch,
    onSearchChange,
    filterKeys: FILTER_KEYS,
    getRowId: (row) => row.id,
    enableRowSelection: canSupervise,
  })

  const stageIds = search.stageId ?? []
  const ownerIds = search.ownerMemberId ?? []
  const tagIds = search.tagId ?? []
  const sources = (search.source ?? []) as CustomerSource[]

  const stageName = (id: string) =>
    stages.data?.find((stage) => stage.id === id)?.name ?? copy.filters.stage
  const ownerName = (id: string) => {
    if (id === NO_OWNER_FILTER) return copy.filters.noOwner
    const member = owners.data?.find((m) => m.id === id)
    return (
      [member?.firstName, member?.lastName].filter(Boolean).join(' ') ||
      member?.username ||
      copy.filters.owner
    )
  }
  const tagName = (id: string) =>
    tags.data?.find((tag) => tag.id === id)?.name ?? copy.filters.tags

  const without = <T,>(list: T[], value: T) => list.filter((v) => v !== value)
  const activeFilters: ActiveFilter[] = [
    ...stageIds.map((id) => ({
      key: `stage-${id}`,
      label: `Etapa: ${stageName(id)}`,
      onRemove: () => grid.setFilter('stageId', without(stageIds, id)),
    })),
    ...ownerIds.map((id) => ({
      key: `owner-${id}`,
      label: `Responsable: ${ownerName(id)}`,
      onRemove: () => grid.setFilter('ownerMemberId', without(ownerIds, id)),
    })),
    ...tagIds.map((id) => ({
      key: `tag-${id}`,
      label: `Etiqueta: ${tagName(id)}`,
      onRemove: () => grid.setFilter('tagId', without(tagIds, id)),
    })),
    ...sources.map((value) => ({
      key: `source-${value}`,
      label: `Origen: ${SOURCE_LABEL[value]}`,
      onRemove: () => grid.setFilter('source', without(sources, value)),
    })),
  ]

  // Detail: the loaded page first (always the freshest), else look it up.
  const selectedId = search.customer
  const inPage = selectedId
    ? grid.items.find((customer) => customer.id === selectedId)
    : undefined
  const lookup = useCustomerById(selectedId, !inPage && !grid.isLoading)
  const selected = inPage ?? lookup.data

  const closeDetail = () => onSearchChange({ customer: undefined })

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await deleteCustomer.mutateAsync(removing.id)
      toast.success(copy.remove.done)
      if (removing.id === selectedId) closeDetail()
      setRemoving(null)
    } catch (error) {
      toast.error(customerErrorMessage(error))
    }
  }

  const confirmBulk = async () => {
    try {
      const { deleted } = await bulkDelete.mutateAsync(grid.selectedIds)
      toast.success(copy.bulk.done(deleted))
      grid.clearSelection()
      setBulkOpen(false)
    } catch (error) {
      toast.error(customerErrorMessage(error))
    }
  }

  const openCreate = () => onSearchChange({ new: true })

  return (
    <>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>{copy.title}</h1>
          <p className='text-muted-foreground max-w-prose text-sm'>
            {copy.purpose}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {canSupervise ? <ImportButton /> : null}
          <Button onClick={openCreate}>
            <UserRoundPlus aria-hidden className='size-4' />
            {copy.add}
          </Button>
        </div>
      </div>

      <div className='mt-6 space-y-4'>
        <DataGridToolbar
          search={grid.params.q ?? ''}
          onSearchChange={grid.setSearchText}
          searchPlaceholder={copy.searchPlaceholder}
          filters={
            <>
              <FacetFilter
                title={copy.filters.stage}
                selected={stageIds}
                onChange={(next) => grid.setFilter('stageId', next)}
                options={(stages.data ?? []).map((stage) => ({
                  value: stage.id,
                  label: stage.name,
                  icon: <ColorDot color={stage.color} />,
                }))}
              />
              <FacetFilter
                title={copy.filters.owner}
                selected={ownerIds}
                onChange={(next) => grid.setFilter('ownerMemberId', next)}
                options={[
                  { value: NO_OWNER_FILTER, label: copy.filters.noOwner },
                  ...(owners.data ?? []).map((member) => ({
                    value: member.id,
                    label:
                      [member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(' ') || member.username,
                  })),
                ]}
              />
              <FacetFilter
                title={copy.filters.tags}
                selected={tagIds}
                onChange={(next) => grid.setFilter('tagId', next)}
                options={(tags.data ?? []).map((tag) => ({
                  value: tag.id,
                  label: tag.name,
                  icon: <ColorDot color={tag.color} />,
                }))}
              />
              <FacetFilter
                title={copy.filters.source}
                selected={sources}
                onChange={(next) =>
                  grid.setFilter('source', next as CustomerSource[])
                }
                options={CUSTOMER_SOURCES.map((value) => ({
                  value,
                  label: SOURCE_LABEL[value],
                }))}
              />
            </>
          }
          activeFilters={activeFilters}
          onReset={grid.reset}
          summary={grid.meta ? copy.count(grid.meta.totalItems) : undefined}
        />

        <div className='rounded-xl border'>
          {grid.isError && !grid.data ? (
            <LoadError
              title={copy.loadError}
              onRetry={() => void grid.query.refetch()}
            />
          ) : (
            <DataGrid
              table={grid.table}
              isLoading={grid.isLoading}
              isFetching={grid.isFetching}
              isFiltered={grid.isFiltered}
              onClearFilters={grid.reset}
              onRowClick={(row) => openCustomer(row.original)}
              getRowLabel={(row) => customerName(row.original)}
              emptyState={
                <GridEmpty
                  icon={<Users />}
                  title={copy.empty.title}
                  description={copy.empty.description}
                  action={<Button onClick={openCreate}>{copy.add}</Button>}
                />
              }
              mobileRow={(row) => (
                <CustomerMobileRow
                  customer={row.original}
                  onOpen={() => openCustomer(row.original)}
                />
              )}
            />
          )}
          <div className='border-t px-3'>
            <DataGridPagination
              page={grid.params.page}
              pageSize={grid.params.perPage}
              total={grid.meta?.totalItems ?? 0}
              onPageChange={grid.setPage}
              onPageSizeChange={grid.setPageSize}
            />
          </div>
        </div>
      </div>

      {canSupervise ? (
        <BulkBar
          count={grid.selectedIds.length}
          noun={copy.bulk.noun}
          onClear={grid.clearSelection}
        >
          <Button
            size='sm'
            variant='ghost'
            className='text-destructive hover:text-destructive'
            onClick={() => setBulkOpen(true)}
          >
            <Trash2 aria-hidden className='size-4' />
            {copy.bulk.remove}
          </Button>
        </BulkBar>
      ) : null}

      <CustomerFormSheet
        open={Boolean(search.new)}
        onOpenChange={(open) => onSearchChange({ new: open ? true : undefined })}
        onViewExisting={(id) => onSearchChange({ customer: id })}
      />
      {editing ? (
        <CustomerFormSheet
          open
          customer={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onViewExisting={(id) => {
            setEditing(null)
            onSearchChange({ customer: id })
          }}
        />
      ) : null}

      {selectedId && !editing ? (
        <CustomerDetailSheet
          customer={selected}
          isLoading={grid.isLoading || lookup.isPending}
          notFound={
            lookup.isError &&
            !selected &&
            getApiError(lookup.error).status === 404
          }
          canSupervise={canSupervise}
          onClose={closeDetail}
          onEdit={(customer) => {
            closeDetail()
            setEditing(customer)
          }}
          onRemove={setRemoving}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={copy.remove.title(removing ? customerName(removing) : '')}
        desc={copy.remove.description}
        destructive
        confirmText={copy.remove.confirm}
        cancelBtnText={copy.remove.cancel}
        isLoading={deleteCustomer.isPending}
        handleConfirm={() => void confirmRemove()}
      />
      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={copy.bulk.title(grid.selectedIds.length)}
        desc={copy.bulk.description}
        destructive
        confirmText={copy.bulk.confirm(grid.selectedIds.length)}
        cancelBtnText={copy.remove.cancel}
        isLoading={bulkDelete.isPending}
        handleConfirm={() => void confirmBulk()}
      />
    </>
  )
}
