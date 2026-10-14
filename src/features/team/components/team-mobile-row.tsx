import type { TeamMemberRow } from '@chat-crm/contracts'
import { Chip, IdentityCell, Meter, PresenceDot } from '@/components/data-grid'
import { PRESENCE_LABEL, ROLE_LABEL, copy } from '../copy'
import { memberName } from '../team-mutations'
import type { TeamActions } from '../team-policy'
import { ROLE_ICON } from '../role-icon'
import { YouBadge } from './you-badge'
import { TeamRowMenu } from './team-row-menu'

type Props = {
  member: TeamMemberRow
  isMe: boolean
  actions: TeamActions
  onOpen: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onRemove: () => void
}

/** Stacked rendering of a member below `md`: tap the card to edit. */
export function TeamMobileRow({
  member,
  isMe,
  actions,
  onOpen,
  onResetPassword,
  onToggleStatus,
  onRemove,
}: Props) {
  const name = memberName(member)
  const Icon = ROLE_ICON[member.role]

  return (
    <div className='group/row flex items-start gap-1 px-4 py-3'>
      <div
        role='button'
        tabIndex={0}
        aria-label={`Abrir ${name}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
        className='focus-visible:ring-ring min-w-0 flex-1 space-y-2 rounded-md focus-visible:ring-2 focus-visible:outline-none'
      >
        <IdentityCell
          tintKey={member.id}
          name={name}
          src={member.avatarUrl}
          title={name}
          subtitle={`@${member.username}`}
          badge={isMe ? <YouBadge /> : null}
        />
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 ps-12'>
          <Chip icon={<Icon aria-hidden />}>{ROLE_LABEL[member.role]}</Chip>
          <PresenceDot
            state={member.presence.state}
            label={PRESENCE_LABEL[member.presence.state]}
          />
          <Meter
            value={member.openConversations}
            max={member.capacity}
            label={copy.loadLabel(member.openConversations, member.capacity)}
          />
        </div>
      </div>
      <TeamRowMenu
        name={name}
        isActive={member.status === 'active'}
        actions={actions}
        onEdit={onOpen}
        onResetPassword={onResetPassword}
        onToggleStatus={onToggleStatus}
        onRemove={onRemove}
      />
    </div>
  )
}
