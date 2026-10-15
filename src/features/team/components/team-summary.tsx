import {
  MEMBER_ROLES,
  PRESENCE_STATES,
  type MemberRole,
  type PresenceState,
  type TeamCounts,
} from '@chat-crm/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PRESENCE_LABEL_PLURAL, ROLE_LABEL_PLURAL, copy } from '../copy'

const DOT: Record<PresenceState, string> = {
  available: 'bg-[var(--positive)]',
  away: 'bg-[var(--warning)]',
  offline: 'bg-[var(--neutro)]/60',
}

function QuickFilter({
  pressed,
  onClick,
  count,
  children,
}: {
  pressed: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'focus-visible:ring-ring inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
        pressed
          ? 'bg-primary/20 text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
      <span className='text-foreground/70 tabular-nums'>{count}</span>
    </button>
  )
}

type Props = {
  counts: TeamCounts | undefined
  roles: MemberRole[]
  presences: PresenceState[]
  onRolesChange: (next: MemberRole[]) => void
  onPresencesChange: (next: PresenceState[]) => void
}

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/**
 * Role and presence counters of the whole company. They are the fastest
 * filters of the screen: one click narrows the table to "who is available now"
 * or "the supervisors", and the counts keep moving as people connect.
 */
export function TeamSummary({
  counts,
  roles,
  presences,
  onRolesChange,
  onPresencesChange,
}: Props) {
  if (!counts) {
    return (
      <div className='flex gap-2' aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className='h-8 w-24 rounded-md' />
        ))}
      </div>
    )
  }

  const everyone = MEMBER_ROLES.reduce((sum, role) => sum + counts.byRole[role], 0)

  return (
    <div
      role='group'
      aria-label='Resumen del equipo'
      className='flex flex-wrap items-center gap-x-1 gap-y-2'
    >
      <QuickFilter
        pressed={roles.length === 0}
        onClick={() => onRolesChange([])}
        count={everyone}
      >
        {copy.all}
      </QuickFilter>
      {MEMBER_ROLES.map((role) => (
        <QuickFilter
          key={role}
          pressed={roles.includes(role)}
          onClick={() => onRolesChange(toggle(roles, role))}
          count={counts.byRole[role]}
        >
          {ROLE_LABEL_PLURAL[role]}
        </QuickFilter>
      ))}

      <span aria-hidden className='bg-border mx-2 hidden h-5 w-px sm:block' />

      {PRESENCE_STATES.map((state) => (
        <QuickFilter
          key={state}
          pressed={presences.includes(state)}
          onClick={() => onPresencesChange(toggle(presences, state))}
          count={counts.byPresence[state]}
        >
          <span className='relative flex size-2'>
            {state === 'available' && counts.byPresence.available > 0 ? (
              <span
                aria-hidden
                className='absolute inline-flex size-full rounded-full bg-[var(--positive)] opacity-50 motion-safe:animate-ping'
              />
            ) : null}
            <span
              aria-hidden
              className={cn('relative size-2 rounded-full', DOT[state])}
            />
          </span>
          {PRESENCE_LABEL_PLURAL[state]}
        </QuickFilter>
      ))}
    </div>
  )
}
