import type { ReactNode } from 'react'
import { useDirection } from '@radix-ui/react-direction'
import { Clock3, MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useNow } from '../../hooks/use-now'
import { isConversationUnassigned } from '../../lib/conversation-assignment'
import {
  formatServiceWindowRemaining,
  serviceWindowState,
  SERVICE_WINDOW_MS,
} from '../../lib/service-window'
import type {
  Chat,
  ChatMessage,
  ChatSentiment,
  ConversationPriority,
} from '../../types/chat.domain'
import { formatPhone, initials } from './identity'
import { STATUS_META } from './status-meta'
import { useToneMode } from './tone-mode'
import { ToneSummary } from './tone-summary'

const PRIORITY_LABEL: Record<ConversationPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

/**
 * Phone body of the case detail, mirrored from the `tablet` breakpoint in
 * `theme.css`: below 768px the chat is a full-width overlay, so the detail
 * opens as a bottom sheet within thumb reach instead of a side panel.
 */
export const RAIL_PHONE_MEDIA_QUERY = '(max-width: 767px)'

/** Below this the countdown stops being background noise. */
export const SERVICE_WINDOW_WARNING_MS = 4 * 60 * 60 * 1000

function RailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className='space-y-2.5 border-b px-4 py-4 last:border-b-0'>
      <h3 className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
        {title}
      </h3>
      {children}
    </section>
  )
}

function RailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-h-7 items-center justify-between gap-3 text-xs'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='flex min-w-0 items-center justify-end font-medium'>
        {children}
      </dd>
    </div>
  )
}

/**
 * Remaining WhatsApp service window, counted client-side from the last
 * customer message. It gets its own section above the case rows because it is
 * the constraint that decides whether a free-form reply is still possible;
 * the expired state points at the template flow (#10) and is the only place
 * the rail spends a semantic color.
 */
function WindowMeter({ messages }: { messages: ChatMessage[] }) {
  // Re-sample the clock while the rail stays mounted, so an open chat flips to
  // "Ventana vencida" when the 24 h boundary passes instead of freezing.
  const now = useNow(60_000)
  const state = serviceWindowState(messages, now)

  if (state.kind === 'none') {
    return (
      <p className='text-muted-foreground text-xs'>
        Aún no hay mensajes del cliente
      </p>
    )
  }

  if (state.kind === 'expired') {
    return (
      <div className='space-y-2'>
        <p className='text-(--negative) text-xs font-medium'>
          Ventana vencida · usa una plantilla
        </p>
        {/* TODO(#10): enable when the template picker ships. */}
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-full'
          disabled
          title='Próximamente: enviar una plantilla aprobada'
        >
          Usar plantilla (próximamente)
        </Button>
      </div>
    )
  }

  // Entering the last hours is worth a typographic nudge, not a new color.
  const isEnding = state.remainingMs <= SERVICE_WINDOW_WARNING_MS

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between text-xs'>
        <span
          className={cn(
            'flex items-center gap-1.5',
            isEnding ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Clock3 className='size-3.5' aria-hidden />
          Ventana de 24 h
        </span>
        <span
          className={cn('tabular-nums', isEnding ? 'font-semibold' : 'font-medium')}
        >
          {formatServiceWindowRemaining(state.remainingMs)}
        </span>
      </div>
      <Progress
        value={(state.remainingMs / SERVICE_WINDOW_MS) * 100}
        className='h-1.5'
        aria-label='Ventana de 24 h restante'
      />
    </div>
  )
}

type CaseRailContentProps = {
  chat: Chat
  messages: ChatMessage[]
  sentiment?: ChatSentiment
  onTake: () => void
  taking: boolean
  currentMemberId?: string
}

/**
 * Single body shared by the inline column and the sheet shells, so the detail
 * never forks between viewports.
 */
function CaseRailContent({
  chat,
  messages,
  sentiment,
  onTake,
  taking,
  currentMemberId,
}: CaseRailContentProps) {
  const [mode] = useToneMode()
  const customerName = chat.customer?.displayName ?? 'Cliente'
  const phone = formatPhone(chat.customer?.phone)
  const status = STATUS_META[chat.status]
  // Header and rail share this predicate: the queue marker or a null owner
  // (needs-response view) both mean the chat can be claimed.
  const isUnassigned = isConversationUnassigned(chat)
  const assignee = chat.member?.username
  // An omitted `member` is the inbox payload (only my conversations); when the
  // payload carries an owner, only a matching id proves the chat is mine.
  const isMine =
    chat.member === undefined || chat.member?.id === currentMemberId

  return (
    <>
      <div className='flex flex-col items-center gap-2 border-b px-4 py-5 text-center'>
        <Avatar className='size-14'>
          <AvatarFallback className='text-base font-semibold'>
            {initials(customerName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className='font-semibold'>{customerName}</p>
          {phone && (
            <p className='text-muted-foreground flex items-center justify-center gap-1 text-xs'>
              <Phone className='size-3' aria-hidden />
              {phone}
            </p>
          )}
        </div>
      </div>

      <RailSection title='Ventana de contacto'>
        <WindowMeter messages={messages} />
      </RailSection>

      <RailSection title='Caso'>
        <dl className='space-y-1'>
          <RailRow label='Estado'>
            <Badge variant='secondary' className={status.className}>
              {status.label}
            </Badge>
          </RailRow>
          <RailRow label='Responsable'>
            {isUnassigned ? (
              <div className='space-y-1.5 text-end'>
                <p className='text-muted-foreground text-xs'>Sin asignar</p>
                <Button
                  type='button'
                  size='sm'
                  className='h-11 w-full px-2.5 text-xs sm:h-8 sm:w-auto'
                  onClick={onTake}
                  disabled={taking}
                >
                  {taking ? 'Tomando…' : 'Tomar chat'}
                </Button>
              </div>
            ) : assignee ? (
              <span className='flex items-center gap-1.5'>
                <Avatar className='size-5'>
                  <AvatarFallback className='text-[9px] font-semibold'>
                    {initials(assignee)}
                  </AvatarFallback>
                </Avatar>
                @{assignee}
              </span>
            ) : isMine ? (
              'Asignado a ti'
            ) : (
              'Otro agente'
            )}
          </RailRow>
          {chat.priority && (
            <RailRow label='Prioridad'>
              <Badge variant='outline'>{PRIORITY_LABEL[chat.priority]}</Badge>
            </RailRow>
          )}
          <RailRow label='Canal'>
            <span className='flex items-center gap-1.5'>
              <MessageCircle className='size-3.5' aria-hidden />
              WhatsApp
            </span>
          </RailRow>
        </dl>
      </RailSection>

      {sentiment && mode !== 'off' && (
        <RailSection title='Sentimiento'>
          <ToneSummary sentiment={sentiment} />
        </RailSection>
      )}
    </>
  )
}

/**
 * Case detail, one body in three shells (ADR-0004):
 * - below `tablet` (768px) a bottom sheet, within thumb reach;
 * - from `tablet` up to the point where the card can hold the rail, a side
 *   sheet opened from the header button;
 * - once the chat card is wide enough (`@rail/card`, see `theme.css`), the
 *   inline `w-72` column, where the thread still fits the case header.
 * The sheet is controlled by `ChatBox` because its trigger lives in the
 * header; the inline column stays in the DOM (CSS-hidden while compact) so
 * the content assertions keep a single, stable target.
 */
export function CaseRail({
  chat,
  messages,
  sentiment,
  onTake,
  taking = false,
  currentMemberId,
  open = false,
  onOpenChange,
  className,
}: {
  chat: Chat
  messages: ChatMessage[]
  sentiment?: ChatSentiment
  onTake: () => void
  taking?: boolean
  /** Signed-in member id, to tell "mine" from another agent without username. */
  currentMemberId?: string
  /** Controlled sheet state; the header button opens it while the rail is not inline. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const isPhone = useMediaQuery(RAIL_PHONE_MEDIA_QUERY)
  // Radix falls back to `ltr`, so the shell still renders without a provider.
  const dir = useDirection()
  // Sheet sides are physical: mirror the inline rail's logical border in RTL.
  const side = isPhone ? 'bottom' : dir === 'rtl' ? 'left' : 'right'

  return (
    <>
      <aside
        aria-label='Detalle del caso'
        className={cn(
          'bg-muted/30 hidden w-72 shrink-0 flex-col overflow-y-auto border-s @rail/card:flex',
          className
        )}
      >
        <CaseRailContent
          chat={chat}
          messages={messages}
          sentiment={sentiment}
          onTake={onTake}
          taking={taking}
          currentMemberId={currentMemberId}
        />
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          aria-describedby={undefined}
          className={cn(
            'gap-0 overflow-y-auto overscroll-contain p-0',
            // The shared Sheet animates unconditionally; respect the user's
            // reduced-motion preference at least on this surface.
            'motion-reduce:animate-none! motion-reduce:duration-0!',
            side === 'bottom'
              ? 'max-h-[85dvh] rounded-t-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]'
              : 'w-full sm:max-w-sm'
          )}
        >
          <SheetTitle className='sr-only'>Detalle del caso</SheetTitle>
          <CaseRailContent
            chat={chat}
            messages={messages}
            sentiment={sentiment}
            onTake={onTake}
            taking={taking}
            currentMemberId={currentMemberId}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
