import { Link } from '@tanstack/react-router'
import type { CustomerRow, Tag } from '@chat-crm/contracts'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Chip, MonogramAvatar } from '@/components/data-grid'
import { CONVERSATION_LABEL, copy } from '../copy'
import { customerName } from '../customers-data'

/** Round colour mark for a tag or pipeline stage. */
export function ColorDot({
  color,
  className,
}: {
  color?: string | null
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color || 'var(--neutro)' }}
    />
  )
}

export function TagChip({ tag }: { tag: Tag }) {
  return <Chip icon={<ColorDot color={tag.color} />}>{tag.name}</Chip>
}

/** Up to two chips and a "+N" for the rest (the full list is in the title). */
export function TagList({ tags, max = 2 }: { tags: Tag[]; max?: number }) {
  if (tags.length === 0) return <span className='text-muted-foreground'>—</span>

  const rest = tags.slice(max)
  return (
    <div className='flex min-w-0 items-center gap-1.5'>
      {tags.slice(0, max).map((tag) => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {rest.length > 0 ? (
        <span
          title={rest.map((tag) => tag.name).join(', ')}
          className='text-muted-foreground text-xs font-medium tabular-nums'
        >
          +{rest.length}
        </span>
      ) : null}
    </div>
  )
}

export function StageLabel({ stage }: { stage: CustomerRow['stage'] }) {
  if (!stage) {
    return <span className='text-muted-foreground text-sm'>{copy.noStage}</span>
  }
  return (
    <span className='inline-flex items-center gap-2 text-sm'>
      <ColorDot color={stage.color} />
      <span className='truncate'>{stage.name}</span>
    </span>
  )
}

export function OwnerLabel({ owner }: { owner: CustomerRow['owner'] }) {
  if (!owner) {
    return <span className='text-muted-foreground text-sm'>{copy.noOwner}</span>
  }
  return (
    <span className='inline-flex min-w-0 items-center gap-2 text-sm'>
      <MonogramAvatar
        size='sm'
        name={owner.name}
        tintKey={owner.memberId}
        src={owner.avatarUrl}
      />
      <span className='truncate'>{owner.name}</span>
    </span>
  )
}

/** Open or pending conversation as a pill that jumps straight to the chat. */
export function OpenConversationLink({
  customer,
}: {
  customer: CustomerRow
}) {
  const open = customer.openConversation
  if (!open) return null

  return (
    <Link
      to='/chats'
      search={{ conversation: open.id }}
      aria-label={copy.openConversationLink(customerName(customer))}
      className='bg-primary/20 text-foreground hover:bg-primary/30 focus-visible:ring-ring inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none'
    >
      <MessageSquare aria-hidden className='size-3' />
      {CONVERSATION_LABEL[open.status] ?? 'Abierta'}
    </Link>
  )
}
