import type { PresenceState } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import { PRESENCE_META } from '../lib/presence-meta'

export function PresenceIcon({
  state,
  className,
}: {
  state: PresenceState
  className?: string
}) {
  const meta = PRESENCE_META[state]
  const Icon = meta.icon
  return (
    <Icon
      className={cn('size-3.5 shrink-0', meta.className, className)}
      aria-label={meta.label}
      role='img'
    />
  )
}
