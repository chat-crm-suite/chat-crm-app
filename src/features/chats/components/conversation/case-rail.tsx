import type { ReactNode } from 'react'
import { Clock3, MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
 * customer message. The expired state points at the template flow (#10).
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
        <p className='text-xs font-medium'>
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

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between text-xs'>
        <span className='text-muted-foreground flex items-center gap-1.5'>
          <Clock3 className='size-3.5' aria-hidden />
          Ventana de 24 h
        </span>
        <span className='font-medium tabular-nums'>
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

/**
 * Wide-screen case rail: customer card, tone panel, case rows and the 24 h
 * service window. Mounted by `ChatBox` as `hidden lg:flex`, so phones keep the
 * full-width thread (ADR-0004).
 */
export function CaseRail({
  chat,
  messages,
  sentiment,
  onTake,
  taking = false,
  currentMemberId,
  className,
}: {
  chat: Chat
  messages: ChatMessage[]
  sentiment?: ChatSentiment
  onTake: () => void
  taking?: boolean
  /** Signed-in member id, to tell "mine" from another agent without username. */
  currentMemberId?: string
  className?: string
}) {
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
    <aside
      aria-label='Detalle del caso'
      className={cn(
        'bg-muted/30 hidden w-80 shrink-0 flex-col overflow-y-auto border-s lg:flex',
        className
      )}
    >
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

      {sentiment && mode !== 'off' && (
        <RailSection title='Sentimiento'>
          <ToneSummary sentiment={sentiment} />
        </RailSection>
      )}

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
                  className='h-7 px-2.5 text-xs'
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
        <div className='pt-1'>
          <WindowMeter messages={messages} />
        </div>
      </RailSection>
    </aside>
  )
}
