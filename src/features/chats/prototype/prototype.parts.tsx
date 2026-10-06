/**
 * PROTOTYPE (disposable): pieces shared by the five thread variants.
 * Only used by `/prototype-chat`.
 *
 * Indicator language (so the two never get confused):
 * - Connection (agent socket): Wifi / WifiOff icon, surface-level status.
 * - Customer tone: Smile / Meh / Frown face, always openable for detail.
 */
import { useId, useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import {
  ArrowDownIcon,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  FileText,
  FileWarning,
  Frown,
  ImagePlus,
  Meh,
  MessageSquareDashed,
  Paperclip,
  RefreshCcw,
  Send,
  Smile,
  StickyNote,
  TrendingDown,
  TrendingUp,
  MoveRight,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { Marker, MarkerContent } from '@/components/ui/marker'
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { chatBuilder } from '../builders/chat.builder'
import type { ChatSentiment } from '../types/chat.domain'
import {
  CUSTOMER,
  MEMBER,
  getPrototypeContent,
  initials,
  toneInsight,
  type PrototypeMessage,
  type SentimentMode,
  type Tone,
  type ToneTrend,
} from './prototype.data'

/** A message added moments ago enters with a short, state-driven animation. */
const RECENT_WINDOW_MS = 1500

/* Message ------------------------------------------------------------------ */

export function StatusTick({
  status,
  className,
}: {
  status: PrototypeMessage['status']
  className?: string
}) {
  const size = className ?? 'size-3.5'
  switch (status) {
    case 'pending':
      return <Clock3 className={size} aria-label='Enviando' />
    case 'sent':
      return <Check className={size} aria-label='Enviado' />
    case 'delivered':
      return <CheckCheck className={size} aria-label='Entregado' />
    case 'read':
      return (
        <CheckCheck
          className={cn(size, 'text-sky-600 dark:text-sky-400')}
          aria-label='Leído'
        />
      )
    case 'failed':
      return (
        <CircleAlert
          className={cn(size, 'text-destructive')}
          aria-label='Falló'
        />
      )
    default:
      return null
  }
}

function RetryButton({
  id,
  onRetry,
  className,
}: {
  id: string
  onRetry: (id: string) => void
  className?: string
}) {
  return (
    <button
      type='button'
      onClick={() => onRetry(id)}
      className={cn(
        'text-destructive focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none',
        className
      )}
    >
      <RefreshCcw className='size-3' />
      Reintentar
    </button>
  )
}

/**
 * Bubble colour pairs. `solid` = primary vs muted (default shadcn), `soft` =
 * tinted vs outlined (calmer, less ink), `chat` = tinted vs raised card (sits
 * on a wallpaper).
 */
export type BubblePalette = 'solid' | 'soft' | 'chat'

const PALETTES: Record<
  BubblePalette,
  {
    mine: 'default' | 'tinted'
    theirs: 'muted' | 'outline'
    theirsClass?: string
  }
> = {
  solid: { mine: 'default', theirs: 'muted' },
  soft: { mine: 'tinted', theirs: 'outline' },
  chat: {
    mine: 'tinted',
    theirs: 'outline',
    theirsClass:
      '*:data-[slot=bubble-content]:border-transparent *:data-[slot=bubble-content]:bg-card *:data-[slot=bubble-content]:shadow-xs',
  },
}

/** Compact time + tick for inside-bubble meta. */
function MetaInline({ message }: { message: PrototypeMessage }) {
  const isMine = message.sender.type === 'member'

  return (
    <span className='flex items-center justify-end gap-1 text-[10px] leading-none opacity-70'>
      <time dateTime={message.timestamp.toISOString()} className='tabular-nums'>
        {format(message.timestamp, 'HH:mm')}
      </time>
      {isMine && <StatusTick status={message.status} className='size-3' />}
    </span>
  )
}

export function MessageRow({
  message,
  onRetry,
  tail = true,
  withSenderLabel = false,
  metaMode = 'footer',
  palette = 'solid',
  addon,
}: {
  message: PrototypeMessage
  onRetry: (id: string) => void
  tail?: boolean
  withSenderLabel?: boolean
  metaMode?: 'footer' | 'inside'
  palette?: BubblePalette
  /** Extra inline node next to the footer meta (e.g. per-message tone). */
  addon?: ReactNode
}) {
  const isMine = message.sender.type === 'member'
  const content = getPrototypeContent(message)
  const attachment = message.msg.attachmentStatus ?? null
  const media = message.msg.mediaUrl ?? undefined
  const isPending = message.status === 'pending'
  const isFailed = isMine && message.status === 'failed'
  const isRecent = Date.now() - message.timestamp.getTime() < RECENT_WINDOW_MS
  const inside = metaMode === 'inside'
  const colors = PALETTES[palette]
  const bubbleVariant = isMine ? colors.mine : colors.theirs
  // The radius lives on BubbleContent, so the tail targets that slot.
  const tailClass = tail
    ? isMine
      ? '*:data-[slot=bubble-content]:rounded-ee-sm'
      : '*:data-[slot=bubble-content]:rounded-es-sm'
    : null
  const textBubbleClass = cn(
    'max-w-[min(82%,65ch)] transition-opacity duration-200',
    tailClass,
    !isMine && colors.theirsClass,
    isPending && 'opacity-70'
  )
  const mediaBubbleClass = cn(
    'max-w-[82%]',
    tailClass,
    !isMine && colors.theirsClass
  )
  const hasCaption = Boolean(content.caption)

  if (message.internal) {
    return (
      <Message
        align='end'
        className={cn(isRecent && 'motion-safe:animate-message-in')}
      >
        <MessageContent className='gap-1'>
          <InternalNote
            message={message}
            className='max-w-[min(82%,65ch)] self-end'
          />
          <MessageFooter>
            <time
              dateTime={message.timestamp.toISOString()}
              className='tabular-nums'
            >
              {format(message.timestamp, 'HH:mm')}
            </time>
          </MessageFooter>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message
      align={isMine ? 'end' : 'start'}
      className={cn(isRecent && 'motion-safe:animate-message-in')}
    >
      <MessageContent className='gap-1'>
        {withSenderLabel && !isMine && (
          <MessageHeader>{CUSTOMER.displayName}</MessageHeader>
        )}

        {message.msg.type === 'text' && (
          <Bubble variant={bubbleVariant} className={textBubbleClass}>
            <BubbleContent className={cn(inside && 'flex flex-col gap-0.5')}>
              <span>{content.body}</span>
              {inside && <MetaInline message={message} />}
            </BubbleContent>
          </Bubble>
        )}

        {message.msg.type !== 'text' && attachment === 'pending' && (
          <Bubble variant={bubbleVariant} className={mediaBubbleClass}>
            <BubbleContent className='flex flex-col gap-1 p-1.5'>
              <span className='bg-muted/60 flex h-40 w-56 max-w-full items-center justify-center rounded-lg'>
                <Spinner
                  aria-label='Cargando'
                  className='text-muted-foreground size-5'
                />
              </span>
              {content.caption && (
                <span className='px-1.5 text-[13px] leading-snug opacity-80'>
                  {content.caption}
                </span>
              )}
              {inside && (
                <span className='px-1.5'>
                  <MetaInline message={message} />
                </span>
              )}
            </BubbleContent>
          </Bubble>
        )}

        {message.msg.type !== 'text' && attachment === 'failed' && (
          <Bubble
            variant='muted'
            className={cn('border border-dashed', mediaBubbleClass)}
          >
            <BubbleContent className='flex flex-col gap-1'>
              <span className='flex items-center gap-2.5'>
                <FileWarning className='text-destructive size-5 shrink-0' />
                <span className='min-w-0'>
                  <span className='block truncate text-[13px] font-medium'>
                    {content.filename ?? 'Archivo'}
                  </span>
                  <span className='text-muted-foreground block text-xs'>
                    Archivo no disponible
                  </span>
                </span>
              </span>
              {inside && <MetaInline message={message} />}
            </BubbleContent>
          </Bubble>
        )}

        {message.msg.type === 'image' &&
          !attachment?.match(/pending|failed/) &&
          media && (
            <Bubble variant={bubbleVariant} className={mediaBubbleClass}>
              <BubbleContent className='relative p-1.5'>
                <img
                  src={media}
                  alt={content.caption ?? 'Imagen'}
                  loading='lazy'
                  decoding='async'
                  className='bg-muted aspect-[3/2] max-h-64 w-full max-w-xs rounded-lg object-cover'
                />
                {hasCaption ? (
                  <>
                    <p className='px-1.5 pt-1.5 text-[13px] leading-snug'>
                      {content.caption}
                    </p>
                    {inside && (
                      <span className='block px-1.5 pt-1'>
                        <MetaInline message={message} />
                      </span>
                    )}
                  </>
                ) : (
                  inside && (
                    <span className='bg-foreground/60 text-background absolute end-2.5 bottom-2.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none'>
                      <time
                        dateTime={message.timestamp.toISOString()}
                        className='tabular-nums'
                      >
                        {format(message.timestamp, 'HH:mm')}
                      </time>
                      {isMine && (
                        <StatusTick
                          status={message.status}
                          className='size-3'
                        />
                      )}
                    </span>
                  )
                )}
              </BubbleContent>
            </Bubble>
          )}

        {message.msg.type === 'document' &&
          !attachment?.match(/pending|failed/) && (
            <Bubble variant={bubbleVariant} className={mediaBubbleClass}>
              <BubbleContent className='flex flex-col gap-1'>
                <span className='flex items-center gap-2.5'>
                  <FileText className='size-5 shrink-0' />
                  <span className='min-w-0'>
                    <span className='block truncate text-[13px] font-medium'>
                      {content.filename ?? 'Documento'}
                    </span>
                    {content.caption && (
                      <span className='block text-xs opacity-80'>
                        {content.caption}
                      </span>
                    )}
                  </span>
                </span>
                {inside && <MetaInline message={message} />}
              </BubbleContent>
            </Bubble>
          )}

        {!inside && (
          <MessageFooter className='gap-1.5'>
            <time
              dateTime={message.timestamp.toISOString()}
              className='tabular-nums'
            >
              {format(message.timestamp, 'HH:mm')}
            </time>
            {isMine && <StatusTick status={message.status} />}
            {addon}
            {isFailed && (
              <RetryButton id={message.id} onRetry={onRetry} className='ms-1' />
            )}
          </MessageFooter>
        )}

        {inside && isFailed && (
          <RetryButton
            id={message.id}
            onRetry={onRetry}
            className='self-end text-[11px]'
          />
        )}
      </MessageContent>
    </Message>
  )
}

/** Internal note card: dashed amber, labelled, never looks like a sent bubble. */
function InternalNote({
  message,
  className,
}: {
  message: PrototypeMessage
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-chart-4/60 bg-chart-4/10 w-fit rounded-xl border border-dashed px-3 py-2 text-sm leading-relaxed wrap-break-word',
        className
      )}
    >
      <p className='text-muted-foreground mb-0.5 flex items-center gap-1 text-[11px] font-medium'>
        <StickyNote className='size-3' aria-hidden />
        Nota interna · solo tu equipo
      </p>
      {getPrototypeContent(message).body}
    </div>
  )
}

/* Team row (Slack-like, no bubbles) ----------------------------------------- */

export function TeamMessageRow({
  message,
  onRetry,
}: {
  message: PrototypeMessage
  onRetry: (id: string) => void
}) {
  const isMine = message.sender.type === 'member'
  const content = getPrototypeContent(message)
  const attachment = message.msg.attachmentStatus ?? null
  const media = message.msg.mediaUrl ?? undefined
  const isPending = message.status === 'pending'
  const isFailed = isMine && message.status === 'failed'
  const isRecent = Date.now() - message.timestamp.getTime() < RECENT_WINDOW_MS
  const name = isMine ? 'Tú' : CUSTOMER.displayName

  return (
    <div
      className={cn(
        'flex gap-2.5',
        isPending && 'opacity-70 transition-opacity duration-200',
        isRecent && 'motion-safe:animate-message-in'
      )}
    >
      <Avatar className='mt-0.5 size-7 shrink-0'>
        <AvatarFallback
          className={cn(
            'text-[10px] font-semibold',
            isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {isMine
            ? initials(MEMBER.displayName)
            : initials(CUSTOMER.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='text-xs font-semibold'>{name}</span>
          <span className='text-muted-foreground flex items-center gap-1 text-[11px] tabular-nums'>
            {format(message.timestamp, 'HH:mm')}
            {isMine && !message.internal && (
              <StatusTick status={message.status} className='size-3' />
            )}
          </span>
        </div>

        {message.internal && (
          <InternalNote message={message} className='mt-1' />
        )}

        <div className='mt-0.5 text-sm leading-relaxed wrap-break-word'>
          {message.msg.type === 'text' && !message.internal && content.body}

          {message.msg.type !== 'text' && attachment === 'pending' && (
            <span className='bg-muted/40 text-muted-foreground flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs'>
              <Spinner aria-label='Cargando' className='size-4' />
              Cargando archivo…
            </span>
          )}

          {message.msg.type !== 'text' && attachment === 'failed' && (
            <span className='flex w-fit items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs'>
              <FileWarning className='text-destructive size-4 shrink-0' />
              <span className='min-w-0'>
                <span className='block truncate font-medium'>
                  {content.filename ?? 'Archivo'}
                </span>
                <span className='text-muted-foreground block'>
                  Archivo no disponible
                </span>
              </span>
            </span>
          )}

          {message.msg.type === 'image' &&
            !attachment?.match(/pending|failed/) &&
            media && (
              <span className='block'>
                <img
                  src={media}
                  alt={content.caption ?? 'Imagen'}
                  loading='lazy'
                  decoding='async'
                  className='bg-muted mt-1 aspect-[3/2] max-h-64 w-full max-w-xs rounded-xl border object-cover'
                />
                {content.caption && (
                  <span className='text-muted-foreground mt-1 block text-xs'>
                    {content.caption}
                  </span>
                )}
              </span>
            )}

          {message.msg.type === 'document' &&
            !attachment?.match(/pending|failed/) && (
              <span className='block'>
                <span className='mt-1 flex w-fit items-center gap-2 rounded-xl border px-3 py-2'>
                  <FileText className='size-4 shrink-0' />
                  <span className='min-w-0 truncate text-[13px] font-medium'>
                    {content.filename ?? 'Documento'}
                  </span>
                </span>
                {content.caption && (
                  <span className='text-muted-foreground mt-1 block text-xs'>
                    {content.caption}
                  </span>
                )}
              </span>
            )}
        </div>

        {isFailed && (
          <RetryButton
            id={message.id}
            onRetry={onRetry}
            className='mt-1 text-xs'
          />
        )}
      </div>
    </div>
  )
}

/* Thread ------------------------------------------------------------------- */

type ThreadRow =
  | { kind: 'date'; id: string; label: string }
  | { kind: 'messages'; id: string; messages: PrototypeMessage[] }

function buildRows(messages: PrototypeMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = []
  const sorted = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  let currentDate = ''
  for (const message of sorted) {
    const dateKey = format(message.timestamp, 'yyyy-MM-dd')
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
      lastMessage?.sender.type === message.sender.type
    ) {
      last.messages.push(message)
    } else {
      rows.push({ kind: 'messages', id: message.id, messages: [message] })
    }
  }

  return rows
}

/** Loading skeleton rows: varied widths and sides, never a pattern. */
const SKELETON_ROWS = [
  { width: 'w-40', mine: false },
  { width: 'w-56', mine: true },
  { width: 'w-24', mine: true },
  { width: 'w-52', mine: false },
  { width: 'w-44', mine: true },
] as const

export function Thread({
  messages,
  onRetry,
  leading,
  className,
  contentClassName,
  withSenderLabels = false,
  loading = false,
  tail = true,
  layout = 'bubbles',
  metaMode = 'footer',
  dateStyle = 'separator',
  palette = 'solid',
  messageAddon,
}: {
  messages: PrototypeMessage[]
  onRetry: (id: string) => void
  leading?: ReactNode
  className?: string
  contentClassName?: string
  withSenderLabels?: boolean
  loading?: boolean
  tail?: boolean
  layout?: 'bubbles' | 'team'
  metaMode?: 'footer' | 'inside'
  dateStyle?: 'separator' | 'quiet' | 'pill'
  palette?: BubblePalette
  /** Inline extra next to each bubble's footer meta (footer meta only). */
  messageAddon?: (message: PrototypeMessage) => ReactNode
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
              className={cn('gap-3 px-3 py-4 sm:px-6', contentClassName)}
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
                        'h-9 rounded-2xl',
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
                    {CUSTOMER.displayName}.
                  </p>
                </div>
              )}

              {!loading && (
                <>
                  {leading && (
                    <MessageScrollerItem messageId='leading'>
                      {leading}
                    </MessageScrollerItem>
                  )}
                  {rows.map((row) =>
                    row.kind === 'date' ? (
                      <MessageScrollerItem key={row.id} messageId={row.id}>
                        {dateStyle === 'separator' ? (
                          <Marker variant='separator' className='text-xs'>
                            <MarkerContent>{row.label}</MarkerContent>
                          </Marker>
                        ) : dateStyle === 'pill' ? (
                          <Marker className='justify-center'>
                            <MarkerContent className='bg-card/90 text-foreground/80 rounded-full px-3 py-1 text-[11px] font-medium shadow-xs backdrop-blur'>
                              {row.label}
                            </MarkerContent>
                          </Marker>
                        ) : (
                          <Marker className='text-muted-foreground justify-center text-xs'>
                            <MarkerContent>{row.label}</MarkerContent>
                          </Marker>
                        )}
                      </MessageScrollerItem>
                    ) : (
                      <MessageScrollerItem key={row.id} messageId={row.id}>
                        {layout === 'team' ? (
                          <div className='flex flex-col gap-3'>
                            {row.messages.map((message) => (
                              <TeamMessageRow
                                key={message.id}
                                message={message}
                                onRetry={onRetry}
                              />
                            ))}
                          </div>
                        ) : (
                          <MessageGroup className='gap-1.5'>
                            {row.messages.map((message, index) => (
                              <MessageRow
                                key={message.id}
                                message={message}
                                onRetry={onRetry}
                                tail={tail}
                                metaMode={metaMode}
                                palette={palette}
                                addon={messageAddon?.(message)}
                                withSenderLabel={
                                  withSenderLabels && index === 0
                                }
                              />
                            ))}
                          </MessageGroup>
                        )}
                      </MessageScrollerItem>
                    )
                  )}
                </>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton>
            <ArrowDownIcon />
            <span className='sr-only'>Ir al final de la conversación</span>
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  )
}

/* Composer ----------------------------------------------------------------- */

export function Composer({
  connected,
  onSend,
  above,
  toolbar,
  placeholder = 'Escribe un mensaje…',
  shape = 'bar',
  frameClassName,
}: {
  connected: boolean
  onSend: (text: string) => void
  /** Slot above the field; `insert` replaces the draft (quick replies, AI). */
  above?: (insert: (text: string) => void) => ReactNode
  /** Slot inside the frame, above the field row (tabs, modes…). */
  toolbar?: ReactNode
  placeholder?: string
  /** `bar` = docked with a top border; `floating` = card hovering the thread. */
  shape?: 'bar' | 'floating'
  frameClassName?: string
}) {
  const [value, setValue] = useState('')
  const fieldId = useId()

  const send = () => {
    const text = value.trim()
    if (!text || !connected) return
    onSend(text)
    setValue('')
  }

  return (
    <form
      className={cn(
        'flex-none',
        shape === 'bar'
          ? 'bg-card border-t p-3 sm:p-4'
          : 'px-3 pt-1 pb-3 sm:px-6 sm:pb-5'
      )}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      {above?.((text) => setValue(text))}
      <div
        className={cn(
          'border-input bg-background focus-within:border-ring focus-within:ring-ring/40 flex flex-col border transition-[border-color,box-shadow,background-color] focus-within:ring-2',
          shape === 'bar' ? 'rounded-2xl' : 'rounded-3xl shadow-lg',
          frameClassName
        )}
      >
        {toolbar}
        <div className='flex items-end gap-1.5 p-1.5 ps-2'>
          <div className='flex items-center gap-0.5 pb-0.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden size-9 shrink-0 sm:inline-flex'
              disabled
              title='Próximamente: enviar imagen'
              aria-label='Enviar imagen (próximamente)'
            >
              <ImagePlus className='text-muted-foreground size-[18px]' />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden size-9 shrink-0 sm:inline-flex'
              disabled
              title='Próximamente: adjuntar archivo'
              aria-label='Adjuntar archivo (próximamente)'
            >
              <Paperclip className='text-muted-foreground size-[18px]' />
            </Button>
          </div>

          <label htmlFor={fieldId} className='sr-only'>
            Escribe un mensaje
          </label>
          <Textarea
            id={fieldId}
            rows={1}
            value={value}
            disabled={!connected}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            placeholder={connected ? placeholder : 'Reconectando…'}
            className='caret-primary max-h-32 min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent'
          />

          <Button
            type='submit'
            size='icon'
            className='size-9 shrink-0 rounded-full'
            disabled={!connected || !value.trim()}
            aria-label='Enviar mensaje'
          >
            <Send className='size-4' />
          </Button>
        </div>
      </div>
      {!connected && (
        <p className='text-muted-foreground mt-2 flex items-center gap-1.5 text-xs'>
          <WifiOff className='text-destructive size-3.5 shrink-0' aria-hidden />
          Sin conexión con el socket. El envío se reactiva al reconectar.
        </p>
      )}
    </form>
  )
}

/* Sentiment ---------------------------------------------------------------- */

/**
 * Colors come from the app theme tokens (--positive/--neutro/--negative), and
 * each tone carries its own face so it never reads as a plain status dot.
 *
 * Three layers of detail, same visual vocabulary:
 * - Pill (header): face + stacked meter + trend arrow.
 * - Marker (inline line): face + label + trend chip.
 * - Card (rail / popover): mix, trend, per-message timeline, last-message alert.
 */
export const DOMINANT_META: Record<
  Tone,
  { label: string; color: string; icon: LucideIcon }
> = {
  POS: { label: 'Positivo', color: 'var(--positive)', icon: Smile },
  NEU: { label: 'Neutral', color: 'var(--neutro)', icon: Meh },
  NEG: { label: 'Negativo', color: 'var(--negative)', icon: Frown },
}

const TREND_META: Record<
  ToneTrend,
  { label: string; color: string; icon: LucideIcon }
> = {
  up: { label: 'Mejorando', color: 'var(--positive)', icon: TrendingUp },
  down: { label: 'Empeorando', color: 'var(--negative)', icon: TrendingDown },
  flat: { label: 'Estable', color: 'var(--neutro)', icon: MoveRight },
}

function tint(color: string, amount: number) {
  return `color-mix(in oklch, ${color} ${amount}%, transparent)`
}

function shares(sentiment: ChatSentiment) {
  return [
    { tone: 'POS', value: sentiment.avgPos },
    { tone: 'NEU', value: sentiment.avgNeu },
    { tone: 'NEG', value: sentiment.avgNeg },
  ] as const
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function excerpt(message: PrototypeMessage) {
  const content = getPrototypeContent(message)
  return content.body ?? content.caption ?? content.filename ?? 'Adjunto'
}

/** One stacked bar for the whole mix, instead of three separate meters. */
export function SentimentMeter({
  sentiment,
  className,
}: {
  sentiment: ChatSentiment
  className?: string
}) {
  const parts = shares(sentiment)

  return (
    <div
      role='img'
      aria-label={parts
        .map(
          (part) => `${DOMINANT_META[part.tone].label} ${percent(part.value)}`
        )
        .join(', ')}
      className={cn('flex h-2 w-full gap-0.5', className)}
    >
      {parts.map((part) => (
        <span
          key={part.tone}
          className='h-full min-w-1 rounded-full transition-[flex-grow] duration-500'
          style={{
            flexGrow: part.value,
            backgroundColor: DOMINANT_META[part.tone].color,
          }}
        />
      ))}
    </div>
  )
}

function TrendChip({ trend }: { trend: ToneTrend }) {
  const meta = TREND_META[trend]
  const Icon = meta.icon

  return (
    <span
      className='inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium'
      style={{ color: meta.color, backgroundColor: tint(meta.color, 12) }}
    >
      <Icon className='size-3' aria-hidden />
      {meta.label}
    </span>
  )
}

/**
 * Diverging sparkline: positive grows up from the midline, negative grows
 * down, neutral is a short tick. The newest message is fully opaque.
 */
function ToneTimeline({
  points,
}: {
  points: ReturnType<typeof toneInsight>['points']
}) {
  const recent = points.slice(-14)

  return (
    <div className='space-y-1.5'>
      <div className='text-muted-foreground flex justify-between text-[11px]'>
        <span>Por mensaje del cliente</span>
        <span>reciente →</span>
      </div>
      <ol
        aria-label='Tono de los últimos mensajes del cliente'
        className='before:bg-border relative flex h-10 items-stretch gap-1.5 before:absolute before:inset-x-0 before:top-1/2 before:h-px'
      >
        {recent.map(({ message, tone }, index) => {
          const meta = DOMINANT_META[tone]
          const isLast = index === recent.length - 1
          const shape =
            tone === 'POS'
              ? { top: '8%', bottom: '50%' }
              : tone === 'NEG'
                ? { top: '50%', bottom: '8%' }
                : { top: 'calc(50% - 2px)', bottom: 'calc(50% - 2px)' }

          return (
            <li
              key={message.id}
              title={`${format(message.timestamp, 'HH:mm')} · ${meta.label}: ${excerpt(message)}`}
              className='relative w-3.5 shrink-0'
            >
              <span
                className={cn(
                  'absolute inset-x-0 rounded-[3px]',
                  !isLast && 'opacity-55'
                )}
                style={{ ...shape, backgroundColor: meta.color }}
              />
              <span className='sr-only'>
                {format(message.timestamp, 'HH:mm')} {meta.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function LastToneAlert({ message }: { message: PrototypeMessage }) {
  const color = DOMINANT_META.NEG.color

  return (
    <div
      role='status'
      className='flex gap-2 rounded-lg border p-2.5 text-xs'
      style={{ borderColor: tint(color, 35), backgroundColor: tint(color, 7) }}
    >
      <TriangleAlert
        className='mt-px size-3.5 shrink-0'
        style={{ color }}
        aria-hidden
      />
      <div className='min-w-0 space-y-0.5'>
        <p className='font-medium'>
          Último mensaje negativo · {format(message.timestamp, 'HH:mm')}
        </p>
        <p className='text-muted-foreground line-clamp-2'>
          «{excerpt(message)}»
        </p>
      </div>
    </div>
  )
}

/** Full card: rail section and popover body. */
export function SentimentPanel({
  sentiment,
  mode,
  messages = [],
}: {
  sentiment: ChatSentiment
  mode: 'full' | 'mini'
  messages?: PrototypeMessage[]
}) {
  const insight = useMemo(() => toneInsight(messages), [messages])
  const meta = DOMINANT_META[sentiment.dominant]
  const Face = meta.icon

  return (
    <div className='space-y-3.5'>
      <div className='flex items-center gap-3'>
        <span
          className='flex size-10 shrink-0 items-center justify-center rounded-full'
          style={{ backgroundColor: tint(meta.color, 14) }}
        >
          <Face className='size-5' style={{ color: meta.color }} aria-hidden />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold'>
            Tono {meta.label.toLowerCase()}
          </p>
          <p className='text-muted-foreground text-[11px]'>
            {sentiment.totalMessages} mensajes analizados
          </p>
        </div>
        {messages.length > 0 && <TrendChip trend={insight.trend} />}
      </div>

      <div className='space-y-2'>
        <SentimentMeter sentiment={sentiment} />
        {mode === 'full' && (
          <ul className='flex justify-between gap-2 text-[11px]'>
            {shares(sentiment).map((part) => {
              const partMeta = DOMINANT_META[part.tone]
              const Icon = partMeta.icon
              return (
                <li key={part.tone} className='flex items-center gap-1'>
                  <Icon
                    className='size-3'
                    style={{ color: partMeta.color }}
                    aria-hidden
                  />
                  <span className='font-medium tabular-nums'>
                    {percent(part.value)}
                  </span>
                  <span className='text-muted-foreground'>
                    {partMeta.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {mode === 'full' && insight.points.length > 1 && (
        <ToneTimeline points={insight.points} />
      )}

      {insight.last?.tone === 'NEG' && (
        <LastToneAlert message={insight.last.message} />
      )}
    </div>
  )
}

function SentimentDetail({
  sentiment,
  messages,
  align,
}: {
  sentiment: ChatSentiment
  messages?: PrototypeMessage[]
  align: 'start' | 'end'
}) {
  return (
    <PopoverContent align={align} className='w-80'>
      <p className='text-muted-foreground mb-3 text-xs font-medium'>
        Análisis de sentimiento
      </p>
      <SentimentPanel sentiment={sentiment} mode='full' messages={messages} />
    </PopoverContent>
  )
}

/** Header pill: face, mix and trend at a glance; opens the full card. */
export function SentimentBadge({
  sentiment,
  mode,
  messages = [],
}: {
  sentiment: ChatSentiment
  mode: SentimentMode
  messages?: PrototypeMessage[]
}) {
  const insight = useMemo(() => toneInsight(messages), [messages])
  if (mode === 'off') return null
  const meta = DOMINANT_META[sentiment.dominant]
  const Face = meta.icon
  const trend = TREND_META[insight.trend]
  const Trend = trend.icon
  const lastIsNegative = insight.last?.tone === 'NEG'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='hover:bg-accent focus-visible:ring-ring inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none'
          style={
            lastIsNegative
              ? { borderColor: tint(DOMINANT_META.NEG.color, 45) }
              : undefined
          }
        >
          <Face
            className='size-4 shrink-0'
            style={{ color: meta.color }}
            aria-hidden
          />
          {mode === 'full' && (
            <span aria-hidden className='hidden text-xs font-medium sm:inline'>
              {meta.label}
            </span>
          )}
          <SentimentMeter
            sentiment={sentiment}
            className='hidden h-1.5 w-12 sm:flex'
          />
          {mode === 'full' &&
            messages.length > 0 &&
            insight.trend !== 'flat' && (
              <Trend
                className='size-3.5 shrink-0'
                style={{ color: trend.color }}
                aria-hidden
              />
            )}
          <span className='sr-only'>
            Tono {meta.label.toLowerCase()}, tendencia{' '}
            {trend.label.toLowerCase()}
            {lastIsNegative && ', último mensaje negativo'}. Ver detalle
          </span>
        </button>
      </PopoverTrigger>
      <SentimentDetail sentiment={sentiment} messages={messages} align='end' />
    </Popover>
  )
}

/** Inline line (thread lead-in, property strips). */
export function SentimentMarker({
  sentiment,
  mode,
  messages = [],
}: {
  sentiment: ChatSentiment
  mode: SentimentMode
  messages?: PrototypeMessage[]
}) {
  const insight = useMemo(() => toneInsight(messages), [messages])
  if (mode === 'off') return null
  const meta = DOMINANT_META[sentiment.dominant]
  const Face = meta.icon

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-2 rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
        >
          <Face
            className='size-4 shrink-0'
            style={{ color: meta.color }}
            aria-hidden
          />
          <span className='text-start'>
            Tono {meta.label.toLowerCase()}
            {mode === 'full' && ` · ${sentiment.totalMessages} mensajes`}
          </span>
          {mode === 'full' && messages.length > 0 && (
            <TrendChip trend={insight.trend} />
          )}
          <span className='sr-only'>Ver detalle</span>
        </button>
      </PopoverTrigger>
      <SentimentDetail
        sentiment={sentiment}
        messages={messages}
        align='start'
      />
    </Popover>
  )
}
