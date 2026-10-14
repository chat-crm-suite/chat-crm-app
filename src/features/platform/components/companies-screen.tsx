import { useMemo, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Building2, Plus } from 'lucide-react'
import type { CompanyStatus, PlatformCompanyRow } from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  DataGrid,
  DataGridPagination,
  DataGridToolbar,
  FacetFilter,
  GridEmpty,
  StatusDot,
  type ActiveFilter,
} from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  getPlatformCompanies,
  isPlatformLocked,
  restorePlatformCompany,
} from '@/services/platform.service'
import { COMPANIES_COPY, DELETE_COPY, STATUS_LABELS } from '../copy'
import {
  DEFAULT_PER_PAGE,
  parseSort,
  serializeSort,
  toCompanyQuery,
  type CompaniesSearch,
} from '../lib/companies-search'
import { CompanyActions, CompanyIdentity, getCompanyColumns, STATUS_TONE } from './company-columns'
import { CreateCompanySheet } from './create-company-sheet'
import { DeleteCompanyDialog } from './delete-company-dialog'
import { EditCompanySheet } from './edit-company-sheet'

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as CompanyStatus[]).map(
  (value) => ({ value, label: STATUS_LABELS[value] })
)

type Props = {
  search: CompaniesSearch
  /** Merges a patch into the URL search params. */
  onSearchChange: (patch: Partial<CompaniesSearch>) => void
}

export function CompaniesScreen({ search, onSearchChange }: Props) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PlatformCompanyRow | null>(null)
  const [deleting, setDeleting] = useState<PlatformCompanyRow | null>(null)

  const query = toCompanyQuery(search)
  const companies = useQuery({
    queryKey: ['platform', 'companies', query],
    queryFn: () => getPlatformCompanies(query),
    placeholderData: keepPreviousData,
  })

  const {
    mutate: restoreCompany,
    isPending: restoring,
    variables: restoringCompany,
  } = useMutation({
    mutationFn: (company: PlatformCompanyRow) =>
      restorePlatformCompany(company.id),
    onSuccess: (_row, company) => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
      toast.success(DELETE_COPY.restored(company.name))
    },
    onError: (error) => {
      if (!isPlatformLocked(error)) toast.error(DELETE_COPY.restoreFailed)
    },
  })

  const columns = useMemo(
    () =>
      getCompanyColumns({
        onEdit: setEditing,
        onDelete: setDeleting,
        onRestore: (company) => restoreCompany(company),
        restoringId: restoring ? restoringCompany?.id : null,
      }),
    [restoreCompany, restoring, restoringCompany]
  )

  const sorting: SortingState = parseSort(search.sort)
  const perPage = search.perPage ?? DEFAULT_PER_PAGE
  const page = search.page ?? 1
  const total = companies.data?.meta.totalItems ?? 0

  const table = useReactTable({
    data: companies.data?.items ?? [],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: companies.data?.meta.totalPages ?? 1,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: perPage } },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSearchChange({ sort: serializeSort(next), page: 1 })
    },
  })

  const activeFilters: ActiveFilter[] = [
    ...(search.status ?? []).map((status) => ({
      key: `status-${status}`,
      label: STATUS_LABELS[status],
      onRemove: () =>
        onSearchChange({
          status: (search.status ?? []).filter((s) => s !== status),
          page: 1,
        }),
    })),
  ]
  const isFiltered = Boolean(search.q?.trim()) || activeFilters.length > 0

  const clearFilters = () =>
    onSearchChange({ q: undefined, status: undefined, page: 1 })

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {COMPANIES_COPY.title}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {COMPANIES_COPY.description}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className='size-4' />
          {COMPANIES_COPY.create}
        </Button>
      </div>

      <div className='space-y-4'>
        <DataGridToolbar
          search={search.q ?? ''}
          onSearchChange={(q) => onSearchChange({ q: q || undefined, page: 1 })}
          searchPlaceholder={COMPANIES_COPY.searchPlaceholder}
          filters={
            <FacetFilter
              title={COMPANIES_COPY.statusFilter}
              options={STATUS_OPTIONS}
              selected={search.status ?? []}
              onChange={(next) =>
                onSearchChange({
                  status: next.length ? (next as CompanyStatus[]) : undefined,
                  page: 1,
                })
              }
            />
          }
          activeFilters={activeFilters}
          onReset={clearFilters}
          summary={
            companies.data ? COMPANIES_COPY.summary(total) : undefined
          }
          trailing={
            <div className='flex items-center gap-2'>
              <Switch
                id='show-deleted'
                checked={search.deleted ?? false}
                onCheckedChange={(checked) =>
                  onSearchChange({ deleted: checked || undefined, page: 1 })
                }
              />
              <Label htmlFor='show-deleted' className='text-sm font-normal'>
                {COMPANIES_COPY.showDeleted}
              </Label>
            </div>
          }
        />

        {companies.isError && !companies.data ? (
          <p role='alert' className='text-muted-foreground text-sm'>
            {COMPANIES_COPY.loadFailed}{' '}
            <Button
              variant='link'
              className='h-auto p-0'
              onClick={() => void companies.refetch()}
            >
              {COMPANIES_COPY.retry}
            </Button>
          </p>
        ) : (
          <div className='rounded-xl border'>
            <DataGrid
              table={table}
              isLoading={companies.isPending}
              isFetching={companies.isFetching}
              isFiltered={isFiltered}
              onClearFilters={clearFilters}
              onRowClick={(row) => {
                if (!row.original.deletedAt) setEditing(row.original)
              }}
              getRowLabel={(row) => row.original.name}
              emptyState={
                <GridEmpty
                  icon={<Building2 />}
                  title={COMPANIES_COPY.emptyTitle}
                  description={COMPANIES_COPY.emptyDescription}
                  action={
                    <Button onClick={() => setCreating(true)}>
                      <Plus className='size-4' />
                      {COMPANIES_COPY.create}
                    </Button>
                  }
                />
              }
              mobileRow={(row) => {
                const company = row.original
                return (
                  <div
                    className={
                      company.deletedAt
                        ? 'flex items-start gap-3 px-4 py-4 opacity-70'
                        : 'flex items-start gap-3 px-4 py-4'
                    }
                  >
                    <div className='min-w-0 flex-1 space-y-2'>
                      <CompanyIdentity company={company} />
                      <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]'>
                        <StatusDot tone={STATUS_TONE[company.status]}>
                          {STATUS_LABELS[company.status]}
                        </StatusDot>
                        <span className='tabular-nums'>
                          {company.membersCount} miembros
                        </span>
                        <span className='tabular-nums'>
                          {company.customersCount} clientes
                        </span>
                      </div>
                    </div>
                    <CompanyActions
                      company={company}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                      onRestore={(c) => restoreCompany(c)}
                      restoringId={restoring ? restoringCompany?.id : null}
                    />
                  </div>
                )
              }}
            />
            <div className='border-t px-3'>
              <DataGridPagination
                page={page}
                pageSize={perPage}
                total={total}
                onPageChange={(next) => onSearchChange({ page: next })}
                onPageSizeChange={(size) =>
                  onSearchChange({ perPage: size, page: 1 })
                }
              />
            </div>
          </div>
        )}
      </div>

      <CreateCompanySheet open={creating} onOpenChange={setCreating} />
      <EditCompanySheet
        company={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <DeleteCompanyDialog
        company={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  )
}
