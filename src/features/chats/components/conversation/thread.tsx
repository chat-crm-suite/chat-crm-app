import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowDownIcon, MessageSquareDashed } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Marker, MarkerContent } from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Skeleton } from '@/components/ui/skeleton'
import { chatBuilder } from '../../builders/chat.builder'
import { sortChronologically } from '../../lib/thread-state'
import type { ChatMessage } from '../../types/chat.domain'
import { initials } from './identity'
import { MessageRow, type SenderView } from './message-row'

type ThreadRow =
  | { kind: 'date'; id: string; label: string }
  | { kind: 'messages'; id: string; messages: ChatMessage[] }

/**
 * Sorts ascending and groups rows by date; consecutive messages from the same
 * author share one scroller item so the surface breathes like a team thread.
 */
function buildRows(messages: ChatMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = []
  const sorted = sortChronologically(messages)

  let currentDate = ''
  for (const message of sorted) {
    const dateKey = format(new Date(message.timestamp), 'yyyy-MM-dd')
    if (dateKey !== currentDate) {
      currentDate = dateKey
      rows.push({
        kind: 'date',
        id: `date-${dateKey}`,
        label: chatBuilder.label.date(dateKey),
      })
    }

    const last = rows[rows.length - 1]
    const lastMessage = last?.kind === 'messages' ? last.messages.at(-1) : null
    if (
      last?.kind === 'messages' &&
      lastMessage?.sender.id === message.sender.id
    ) {
      last.messages.push(message)
    } else {
      rows.push({ kind: 'messages', id: message.id, messages: [message] })
    }
  }

  return rows
}

/** Loading skeleton rows: varied widths, never a pattern. */
const SKELETON_ROWS = [
  { width: 'w-40', mine: false },
  { width: 'w-56', mine: true },
  { width: 'w-24', mine: true },
  { width: 'w-52', mine: false },
  { width: 'w-44', mine: true },
] as const

/**
 * Resolves the sender line identity for one message. Member messages are
 * "Tú" when they match the signed-in member; other teammates stay "Agente"
 * until the API can resolve real member names.
 */
function resolveSender(
  message: ChatMessage,
  {
    customerName,
    currentMemberId,
    currentMemberName,
  }: {
    customerName: string
    currentMemberId?: string
    currentMemberName?: string
  }
): SenderView {
  if (message.sender.type === 'customer') {
    return {
      name: customerName,
      initials: initials(customerName),
    }
  }

  if (message.sender.type === 'system' || message.sender.type === 'bot') {
    const name = message.sender.type === 'system' ? 'Sistema' : 'Asistente'
    return { name, initials: initials(name) }
  }

  const isMine = currentMemberId
    ? message.sender.id === currentMemberId
    : message.sender.type === 'member'

  if (isMine) {
    const memberName = currentMemberName ?? 'Tú'
    return { name: 'Tú', initials: initials(memberName) }
  }

  return { name: 'Agente', initials: initials('Agente') }
}

export function ConversationThread({
  messages,
  loading = false,
  customerName,
  currentMemberId,
  currentMemberName,
  onRetry,
  className,
}: {
  messages: ChatMessage[]
  loading?: boolean
  customerName: string
  currentMemberId?: string
  currentMemberName?: string
  onRetry: (message: ChatMessage) => void
  className?: string
}) {
  const rows = useMemo(() => buildRows(messages), [messages])
  const isEmpty = !loading && messages.length === 0

  return (
    <div className={cn('relative min-h-0 flex-1', className)}>
      <MessageScrollerProvider autoScroll defaultScrollPosition='end'>
        <MessageScroller>
          <MessageScrollerViewport aria-label='Conversación'>
            <MessageScrollerContent
              aria-busy={loading}
              className='gap-4 px-3 py-4 sm:px-6'
            >
              {loading && (
                <div
                  aria-hidden
                  className='flex flex-1 flex-col justify-end gap-3 py-2'
                >
                  {SKELETON_ROWS.map((row) => (
                    <Skeleton
                      key={row.width}
                      className={cn(
                        'h-9 max-w-full rounded-2xl',
                        row.width,
                        row.mine && 'self-end'
                      )}
                    />
                  ))}
                </div>
              )}

              {isEmpty && (
                <div className='flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center'>
                  <span className='bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full'>
                    <MessageSquareDashed className='size-5' />
                  </span>
                  <p className='text-sm font-medium'>Aún no hay mensajes</p>
                  <p className='text-muted-foreground max-w-64 text-xs'>
                    Escribe el primero para iniciar la conversación con{' '}
                    {customerName}.
                  </p>
                </div>
              )}

              {!loading &&
                rows.map((row) =>
                  row.kind === 'date' ? (
                    <MessageScrollerItem key={row.id} messageId={row.id}>
                      <Marker variant='separator' className='text-xs'>
                        <MarkerContent>{row.label}</MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  ) : (
                    <MessageScrollerItem key={row.id} messageId={row.id}>
                      <div className='flex flex-col gap-3'>
                        {row.messages.map((message) => (
                          <MessageRow
                            key={message.id}
                            message={message}
                            sender={resolveSender(message, {
                              customerName,
                              currentMemberId,
                              currentMemberName,
                            })}
                            onRetry={onRetry}
                          />
                        ))}
                      </div>
                    </MessageScrollerItem>
                  )
                )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className='max-sm:size-11'>
            <ArrowDownIcon />
            <span className='sr-only'>Ir al final de la conversación</span>
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  )
}
