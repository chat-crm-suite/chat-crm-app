import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MEMBER_ROLES,
  MEMBER_STATUSES,
  PRESENCE_STATES,
  type MemberRole,
  type MemberStatus,
  type PresenceState,
  type TeamMemberRow,
  type TeamTableResponse,
} from '@chat-crm/contracts'
import { UserRoundPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useMemberRole } from '@/hooks/use-member-role'
import { useServerTable } from '@/hooks/use-server-table'
import { getTeamTable } from '@/services/team.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  DataGrid,
  DataGridPagination,
  DataGridToolbar,
  FacetFilter,
  GridEmpty,
  type ActiveFilter,
} from '@/components/data-grid'
import { LoadError } from '../workspace/components/load-error'
import { teamKeys } from '../workspace/query-keys'
import { useWorkspaceSync } from '../workspace/use-workspace-sync'
import { MemberFormSheet } from './components/member-form-sheet'
import { RemoveMemberDialog } from './components/remove-member-dialog'
import { ResetPasswordDialog } from './components/reset-password-dialog'
import { useTeamColumns } from './components/use-team-columns'
import { TeamMobileRow } from './components/team-mobile-row'
import { TeamSummary } from './components/team-summary'
import {
  DENIAL_REASON,
  PRESENCE_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  copy,
} from './copy'
import type { TeamSearch } from './search'
import {
  memberName,
  teamErrorMessage,
  useToggleAutoAssign,
  useUpdateMember,
} from './team-mutations'
import { teamActionsFor } from './team-policy'

const FILTER_KEYS = ['role', 'status', 'presence'] as const

type Props = {
  search: TeamSearch
  onSearchChange: (patch: Partial<TeamSearch>) => void
}

/**
 * Body of Equipo: header, quick filters, toolbar and table. It knows nothing
 * about the router (the page binds the URL), so it renders the same in tests.
 */
export function TeamScreen({ search, onSearchChange }: Props) {
  const { memberId, role } = useMemberRole()
  const companyId = useAuthStore((state) => state.auth.company?.id ?? null)
  const actor = useMemo(() => ({ memberId, role }), [memberId, role])

  const [editing, setEditing] = useState<TeamMemberRow | null>(null)
  const [resetting, setResetting] = useState<TeamMemberRow | null>(null)
  const [removing, setRemoving] = useState<TeamMemberRow | null>(null)

  useWorkspaceSync()

  // `mutate`/`mutateAsync` are stable; the mutation objects are not. Column
  // cells are rendered as components, so unstable handlers would remount every
  // cell (and close any open row menu) on each render.
  const { mutate: toggleAutoAssign } = useToggleAutoAssign()
  const { mutateAsync: updateMember } = useUpdateMember()

  const handleAutoAssign = useCallback(
    (member: TeamMemberRow, value: boolean) =>
      toggleAutoAssign({ member, value }),
    [toggleAutoAssign]
  )

  const handleToggleStatus = useCallback(
    async (member: TeamMemberRow) => {
      const status: MemberStatus =
        member.status === 'active' ? 'suspended' : 'active'
      try {
        await updateMember({ id: member.id, input: { status } })
        toast.success(copy.statusChanged(memberName(member), status))
      } catch (error) {
        toast.error(teamErrorMessage(error))
      }
    },
    [updateMember]
  )

  // The columns need the admin count that comes back with the table's first
  // page, so it is mirrored in state (the table is built with the columns).
  const [adminCount, setAdminCount] = useState(0)

  const columns = useTeamColumns({
    actor,
    adminCount,
    onToggleAutoAssign: handleAutoAssign,
    onEdit: setEditing,
    onResetPassword: setResetting,
    onToggleStatus: handleToggleStatus,
    onRemove: setRemoving,
  })

  // `new` only opens the sheet: it must not reach the request or its cache key.
  const tableSearch = useMemo(() => {
    const { new: _new, ...rest } = search
    return rest
  }, [search])

  const grid = useServerTable<
    TeamMemberRow,
    Omit<TeamSearch, 'new'>,
    TeamTableResponse
  >({
    queryKey: [...teamKeys.tables, companyId],
    fetchPage: getTeamTable,
    columns,
    search: tableSearch,
    onSearchChange,
    filterKeys: FILTER_KEYS,
    getRowId: (row) => row.id,
  })
  const counts = grid.data?.meta.counts
  const admins = counts?.byRole.admin
  useEffect(() => {
    if (admins !== undefined) setAdminCount(admins)
  }, [admins])

  const openCreate = () => onSearchChange({ new: true })

  const roles = (search.role ?? []) as MemberRole[]
  const statuses = (search.status ?? []) as MemberStatus[]
  const presences = (search.presence ?? []) as PresenceState[]

  const without = <T,>(list: T[], value: T) => list.filter((v) => v !== value)
  const activeFilters: ActiveFilter[] = [
    ...roles.map((value) => ({
      key: `role-${value}`,
      label: `Rol: ${ROLE_LABEL[value]}`,
      onRemove: () => grid.setFilter('role', without(roles, value)),
    })),
    ...statuses.map((value) => ({
      key: `status-${value}`,
      label: `Estado: ${STATUS_LABEL[value]}`,
      onRemove: () => grid.setFilter('status', without(statuses, value)),
    })),
    ...presences.map((value) => ({
      key: `presence-${value}`,
      label: `Presencia: ${PRESENCE_LABEL[value]}`,
      onRemove: () => grid.setFilter('presence', without(presences, value)),
    })),
  ]

  const openMember = (member: TeamMemberRow) => {
    const decision = teamActionsFor(actor, member, adminCount).edit
    if (decision.allowed) setEditing(member)
    else toast.info(DENIAL_REASON[decision.reason])
  }

  return (
    <>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>{copy.title}</h1>
          <p className='text-muted-foreground max-w-prose text-sm'>
            {copy.purpose}
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserRoundPlus aria-hidden className='size-4' />
          {copy.add}
        </Button>
      </div>

      <div className='mt-6 space-y-4'>
        <TeamSummary
          counts={counts}
          roles={roles}
          presences={presences}
          onRolesChange={(next) => grid.setFilter('role', next)}
          onPresencesChange={(next) => grid.setFilter('presence', next)}
        />

        <DataGridToolbar
          search={grid.params.q ?? ''}
          onSearchChange={grid.setSearchText}
          searchPlaceholder={copy.searchPlaceholder}
          filters={
            <>
              <FacetFilter
                title={copy.filters.role}
                selected={roles}
                onChange={(next) => grid.setFilter('role', next as MemberRole[])}
                options={MEMBER_ROLES.map((value) => ({
                  value,
                  label: ROLE_LABEL[value],
                  count: counts?.byRole[value],
                }))}
              />
              <FacetFilter
                title={copy.filters.status}
                selected={statuses}
                onChange={(next) =>
                  grid.setFilter('status', next as MemberStatus[])
                }
                options={MEMBER_STATUSES.map((value) => ({
                  value,
                  label: STATUS_LABEL[value],
                }))}
              />
              <FacetFilter
                title={copy.filters.presence}
                selected={presences}
                onChange={(next) =>
                  grid.setFilter('presence', next as PresenceState[])
                }
                options={PRESENCE_STATES.map((value) => ({
                  value,
                  label: PRESENCE_LABEL[value],
                  count: counts?.byPresence[value],
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
              onRowClick={(row) => openMember(row.original)}
              getRowLabel={(row) => memberName(row.original)}
              emptyState={
                <GridEmpty
                  icon={<Users />}
                  title={copy.empty.title}
                  description={copy.empty.description}
                  action={<Button onClick={openCreate}>{copy.add}</Button>}
                />
              }
              mobileRow={(row) => {
                const member = row.original
                return (
                  <TeamMobileRow
                    member={member}
                    isMe={member.id === memberId}
                    actions={teamActionsFor(actor, member, adminCount)}
                    onOpen={() => openMember(member)}
                    onResetPassword={() => setResetting(member)}
                    onToggleStatus={() => void handleToggleStatus(member)}
                    onRemove={() => setRemoving(member)}
                  />
                )
              }}
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

      <MemberFormSheet
        open={Boolean(search.new)}
        onOpenChange={(open) => onSearchChange({ new: open ? true : undefined })}
        actor={actor}
      />
      {editing ? (
        <MemberFormSheet
          open
          member={editing}
          actor={actor}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
      <ResetPasswordDialog member={resetting} onClose={() => setResetting(null)} />
      <RemoveMemberDialog member={removing} onClose={() => setRemoving(null)} />
    </>
  )
}
