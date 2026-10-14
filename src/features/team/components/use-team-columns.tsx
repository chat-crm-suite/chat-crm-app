import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { MemberStatus, TeamMemberRow } from '@chat-crm/contracts'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Chip,
  IdentityCell,
  Meter,
  PresenceDot,
  RelativeTime,
  StatusDot,
  type Tone,
} from '@/components/data-grid'
import {
  DENIAL_REASON,
  PRESENCE_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  copy,
} from '../copy'
import { memberName } from '../team-mutations'
import { teamActionsFor, type TeamActor } from '../team-policy'
import { ROLE_ICON } from '../role-icon'
import { TeamRowMenu } from './team-row-menu'
import { YouBadge } from './you-badge'

const STATUS_TONE: Record<MemberStatus, Tone> = {
  active: 'positive',
  inactive: 'neutral',
  suspended: 'warning',
}

export type TeamColumnsContext = {
  actor: TeamActor
  /** Admins in the company, to protect the last one. */
  adminCount: number
  onToggleAutoAssign: (member: TeamMemberRow, value: boolean) => void
  onEdit: (member: TeamMemberRow) => void
  onResetPassword: (member: TeamMemberRow) => void
  onToggleStatus: (member: TeamMemberRow) => void
  onRemove: (member: TeamMemberRow) => void
}

/** Columns of Equipo; handlers come from the page so the cells stay pure. */
export function useTeamColumns(ctx: TeamColumnsContext) {
  const {
    actor,
    adminCount,
    onToggleAutoAssign,
    onEdit,
    onResetPassword,
    onToggleStatus,
    onRemove,
  } = ctx

  return useMemo<ColumnDef<TeamMemberRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (member) => memberName(member),
        header: copy.columns.person,
        size: 280,
        cell: ({ row }) => {
          const member = row.original
          const name = memberName(member)
          return (
            <IdentityCell
              tintKey={member.id}
              name={name}
              src={member.avatarUrl}
              title={name}
              subtitle={`@${member.username}`}
              badge={member.id === actor.memberId ? <YouBadge /> : null}
            />
          )
        },
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: copy.columns.role,
        size: 150,
        cell: ({ row }) => {
          const Icon = ROLE_ICON[row.original.role]
          return <Chip icon={<Icon aria-hidden />}>{ROLE_LABEL[row.original.role]}</Chip>
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: copy.columns.status,
        size: 130,
        cell: ({ row }) => (
          <StatusDot tone={STATUS_TONE[row.original.status]}>
            {STATUS_LABEL[row.original.status]}
          </StatusDot>
        ),
      },
      {
        id: 'presence',
        header: copy.columns.presence,
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <PresenceDot
            state={row.original.presence.state}
            label={PRESENCE_LABEL[row.original.presence.state]}
          />
        ),
      },
      {
        id: 'openConversations',
        accessorKey: 'openConversations',
        header: copy.columns.load,
        size: 170,
        cell: ({ row }) => (
          <Meter
            value={row.original.openConversations}
            max={row.original.capacity}
            label={copy.loadLabel(
              row.original.openConversations,
              row.original.capacity
            )}
          />
        ),
      },
      {
        id: 'autoAssign',
        header: copy.columns.autoAssign,
        size: 150,
        enableSorting: false,
        cell: ({ row }) => {
          const member = row.original
          const name = memberName(member)
          const decision = teamActionsFor(actor, member, adminCount).edit
          const switcher = (
            <Switch
              checked={member.acceptsAutoAssign}
              disabled={!decision.allowed}
              aria-label={copy.autoAssignLabel(name)}
              onCheckedChange={(value) => onToggleAutoAssign(member, value)}
            />
          )

          return (
            <div data-no-row-click className='inline-flex'>
              {decision.allowed ? (
                switcher
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* A disabled control swallows hover: the span carries it. */}
                    <span tabIndex={0} className='inline-flex rounded-full'>
                      {switcher}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-60'>
                    {DENIAL_REASON[decision.reason]}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      },
      {
        id: 'lastLoginAt',
        accessorKey: 'lastLoginAt',
        header: copy.columns.lastLogin,
        size: 140,
        cell: ({ row }) => <RelativeTime date={row.original.lastLoginAt} />,
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Acciones</span>,
        size: 56,
        enableSorting: false,
        cell: ({ row }) => {
          const member = row.original
          return (
            <TeamRowMenu
              name={memberName(member)}
              isActive={member.status === 'active'}
              actions={teamActionsFor(actor, member, adminCount)}
              onEdit={() => onEdit(member)}
              onResetPassword={() => onResetPassword(member)}
              onToggleStatus={() => onToggleStatus(member)}
              onRemove={() => onRemove(member)}
            />
          )
        },
      },
    ],
    [
      actor,
      adminCount,
      onToggleAutoAssign,
      onEdit,
      onResetPassword,
      onToggleStatus,
      onRemove,
    ]
  )
}
