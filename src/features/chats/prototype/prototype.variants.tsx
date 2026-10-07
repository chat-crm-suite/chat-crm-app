/**
 * PROTOTYPE (disposable): structurally different takes on the same thread.
 * Each one bets on a different primary affordance:
 *
 * - A · Mensajería: familiar chat app (wallpaper, tails, meta inside bubble).
 * - B · Consola: operator workspace (customer card rail, 24 h window, quick
 *   replies above the composer).
 * - C · Enfoque: reading first (narrow column, no chrome, floating composer).
 * - D · Ticket: helpdesk case (status strip, bubble-less rows, internal note).
 * - E · Copiloto: AI-assisted (pinned summary, per-message tone, suggested
 *   replies).
 * - F · Consola Pro: convergence pick, B's workspace + D's case workflow
 *   mirrored from the shipped surface (disabled Resolve/Options, rail rows,
 *   quick replies, resolved notice); internal notes remain prototype-only.
 *
 * Indicators never share a shape: connection is a Wifi/WifiOff icon, customer
 * tone is a face (Smile/Meh/Frown) from the theme palette.
 */
import { useEffect, useState, type ReactNode } from 'react'
import {
  CircleCheck,
  Clock3,
  Inbox,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  RotateCcw,
  Sparkles,
  StickyNote,
  Tag,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import {
  AI_SUGGESTIONS,
  CUSTOMER,
  MEMBER,
  QUICK_REPLIES,
  SERVICE_WINDOW_LEFT,
  initials,
  messageTone,
  type PrototypeMessage,
  type SentimentMode,
} from './prototype.data'
import type { PrototypeEngine } from './prototype.engine'
import {
  Composer,
  DOMINANT_META,
  SentimentBadge,
  SentimentMarker,
  SentimentPanel,
  Thread,
} from './prototype.parts'

type VariantProps = {
  engine: PrototypeEngine
  mode: SentimentMode
}

/* Small shared bits (headers stay per variant on purpose) ------------------ */

function CustomerAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarFallback className='bg-muted text-foreground text-xs font-semibold'>
        {initials(CUSTOMER.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}

function MemberAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={cn('size-5', className)}>
      <AvatarFallback className='bg-primary text-primary-foreground text-[9px] font-semibold'>
        {initials(MEMBER.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}

function OptionsButton() {
  return (
    <Button
      variant='ghost'
      size='icon'
      className='size-8'
      aria-label='Más opciones'
    >
      <MoreVertical className='size-4' />
    </Button>
  )
}

function ToneFace({
  message,
  mode,
}: {
  message: PrototypeMessage
  mode: SentimentMode
}) {
  const tone = messageTone(message)
  if (!tone || mode === 'off') return null
  const meta = DOMINANT_META[tone]
  const Face = meta.icon

  return (
    <span
      className='inline-flex items-center gap-1'
      title={`Tono ${meta.label.toLowerCase()}`}
    >
      <Face className='size-3.5' style={{ color: meta.color }} aria-hidden />
      {mode === 'full' && <span className='font-normal'>{meta.label}</span>}
      <span className='sr-only'>Tono {meta.label.toLowerCase()}</span>
    </span>
  )
}

/* A · Mensajería ------------------------------------------------------------ */

export function VariantA({ engine, mode }: VariantProps) {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='bg-card flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <CustomerAvatar className='size-10' />
          <div className='min-w-0'>
            <p className='truncate text-[15px] font-semibold'>
              {CUSTOMER.displayName}
            </p>
            <p className='text-muted-foreground flex items-center gap-1 truncate text-xs'>
              <MessageCircle className='size-3' aria-hidden />
              WhatsApp · {CUSTOMER.phone}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-1.5'>
          <SentimentBadge
            sentiment={engine.sentiment}
            messages={engine.messages}
            mode={mode}
          />
          {engine.unassigned ? (
            <Button
              size='sm'
              className='h-8 rounded-full px-3 text-xs'
              onClick={engine.claim}
            >
              Tomar chat
            </Button>
          ) : (
            <span className='bg-muted text-muted-foreground hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs sm:inline-flex'>
              <MemberAvatar className='size-4' />
              Asignado a ti
            </span>
          )}
          <OptionsButton />
        </div>
      </header>

      <Thread
        messages={engine.messages}
        onRetry={engine.retry}
        loading={engine.threadLoading}
        palette='chat'
        metaMode='inside'
        dateStyle='pill'
        className='bg-muted/60 bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_9%,transparent)_1px,transparent_1.5px)] bg-size-[18px_18px]'
        contentClassName='mx-auto w-full max-w-3xl gap-2'
      />

      <Composer connected={engine.connected} onSend={engine.send} />
    </div>
  )
}

/* B · Consola --------------------------------------------------------------- */

function WindowMeter() {
  // 14 h 32 min left of 24 h.
  const left = 0.6
  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between text-xs'>
        <span className='text-muted-foreground flex items-center gap-1.5'>
          <Clock3 className='size-3.5' aria-hidden />
          Ventana de 24 h
        </span>
        <span className='font-medium tabular-nums'>{SERVICE_WINDOW_LEFT}</span>
      </div>
      <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
        <div
          className='bg-primary h-full rounded-full'
          style={{ width: `${left * 100}%` }}
        />
      </div>
    </div>
  )
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

function CustomerCard() {
  return (
    <div className='flex flex-col items-center gap-2 border-b px-4 py-5 text-center'>
      <CustomerAvatar className='size-14 text-base' />
      <div>
        <p className='font-semibold'>{CUSTOMER.displayName}</p>
        <p className='text-muted-foreground flex items-center justify-center gap-1 text-xs'>
          <Phone className='size-3' aria-hidden />
          {CUSTOMER.phone}
        </p>
      </div>
      <div className='flex flex-wrap justify-center gap-1'>
        <span className='bg-background inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]'>
          <Tag className='size-3' aria-hidden />
          Recurrente
        </span>
        <span className='bg-background inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]'>
          <MapPin className='size-3' aria-hidden />
          Lima
        </span>
      </div>
    </div>
  )
}

function QuickReplies({ insert }: { insert: (text: string) => void }) {
  return (
    <div className='mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5'>
      <Zap
        className='text-muted-foreground size-3.5 shrink-0'
        aria-label='Respuestas rápidas'
      />
      {QUICK_REPLIES.map((reply) => (
        <button
          key={reply.label}
          type='button'
          onClick={() => insert(reply.text)}
          title={reply.text}
          className='bg-background text-muted-foreground hover:border-ring hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md border px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none'
        >
          /{reply.label.toLowerCase()}
        </button>
      ))}
    </div>
  )
}

export function VariantB({ engine, mode }: VariantProps) {
  return (
    <div className='flex h-full min-h-0 flex-col lg:flex-row'>
      <div className='flex min-h-0 flex-1 flex-col'>
        <header className='flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-4'>
          <div className='flex min-w-0 items-center gap-2 text-sm'>
            <span className='truncate font-medium'>{CUSTOMER.displayName}</span>
            <span className='bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]'>
              WA
            </span>
            <span className='text-muted-foreground hidden text-xs sm:inline'>
              {engine.messages.length} mensajes
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='lg:hidden'>
              <SentimentBadge
                sentiment={engine.sentiment}
                messages={engine.messages}
                mode={mode}
              />
            </span>
            {engine.unassigned && (
              <Button
                size='sm'
                variant='secondary'
                className='h-8 px-3 text-xs lg:hidden'
                onClick={engine.claim}
              >
                Tomar
              </Button>
            )}
            <OptionsButton />
          </div>
        </header>

        <Thread
          messages={engine.messages}
          onRetry={engine.retry}
          loading={engine.threadLoading}
          withSenderLabels
          tail={false}
          contentClassName='gap-2'
        />

        <Composer
          connected={engine.connected}
          onSend={engine.send}
          placeholder='Responder… (Enter envía, Shift+Enter salto)'
          above={(insert) => <QuickReplies insert={insert} />}
        />
      </div>

      <aside className='bg-muted/30 hidden w-80 shrink-0 flex-col overflow-y-auto border-s lg:flex'>
        <CustomerCard />

        <RailSection title='Asignación'>
          {engine.unassigned ? (
            <div className='space-y-2.5'>
              <p className='text-muted-foreground text-xs'>
                En la cola de sin asignar desde las 09:12.
              </p>
              <Button size='sm' className='w-full' onClick={engine.claim}>
                Tomar chat
              </Button>
            </div>
          ) : (
            <div className='flex items-center gap-2.5'>
              <MemberAvatar className='size-7' />
              <div className='min-w-0'>
                <p className='truncate text-xs font-medium'>
                  {MEMBER.displayName}
                </p>
                <p className='text-muted-foreground text-xs'>Asignado a ti</p>
              </div>
            </div>
          )}
        </RailSection>

        <RailSection title='Servicio'>
          <WindowMeter />
        </RailSection>

        {mode !== 'off' && (
          <RailSection title='Sentimiento'>
            <SentimentPanel
              sentiment={engine.sentiment}
              messages={engine.messages}
              mode={mode}
            />
          </RailSection>
        )}

        <p className='text-muted-foreground mt-auto px-4 py-3 text-[10px]'>
          Datos simulados: el prototipo no persiste nada.
        </p>
      </aside>
    </div>
  )
}

/* C · Enfoque --------------------------------------------------------------- */

export function VariantC({ engine, mode }: VariantProps) {
  const leading = (
    <div className='flex flex-col gap-3'>
      <SentimentMarker
        sentiment={engine.sentiment}
        messages={engine.messages}
        mode={mode}
      />
      {engine.unassigned && (
        <Marker
          variant='border'
          className='bg-muted/40 gap-2 rounded-lg px-3 py-2'
        >
          <MarkerIcon>
            <Inbox className='size-4' />
          </MarkerIcon>
          <MarkerContent className='flex-1 text-xs'>
            Este chat está en la cola de sin asignar.
          </MarkerContent>
          <Button
            size='sm'
            variant='secondary'
            className='h-7 rounded-full px-3 text-xs'
            onClick={engine.claim}
          >
            Tomar
          </Button>
        </Marker>
      )}
    </div>
  )

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='relative flex flex-col items-center px-12 pt-4 pb-2 text-center'>
        <p className='truncate text-base font-semibold tracking-tight'>
          {CUSTOMER.displayName}
        </p>
        <p className='text-muted-foreground truncate text-xs'>
          {CUSTOMER.phone}
        </p>
        <span className='absolute end-3 top-3'>
          <OptionsButton />
        </span>
      </header>

      <Thread
        messages={engine.messages}
        onRetry={engine.retry}
        leading={leading}
        loading={engine.threadLoading}
        tail={false}
        palette='soft'
        dateStyle='quiet'
        contentClassName='mx-auto w-full max-w-xl gap-6'
      />

      <div className='mx-auto w-full max-w-2xl'>
        <Composer
          connected={engine.connected}
          onSend={engine.send}
          shape='floating'
          placeholder={`Responder a ${CUSTOMER.displayName.split(' ')[0]}…`}
        />
      </div>
    </div>
  )
}

/* Case workflow (shared by D · Ticket and F · Consola Pro) ------------------ */

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <dt className='text-muted-foreground text-[11px]'>{label}</dt>
      <dd className='flex min-h-6 items-center text-xs font-medium'>
        {children}
      </dd>
    </div>
  )
}

function CaseStatusPill({ engine }: { engine: PrototypeEngine }) {
  const status = engine.resolved
    ? { label: 'Resuelto', className: 'bg-muted text-muted-foreground' }
    : engine.unassigned
      ? { label: 'Nuevo', className: 'bg-chart-2/15 text-chart-2' }
      : { label: 'Abierto', className: 'bg-primary/20 text-foreground' }

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        status.className
      )}
    >
      {status.label}
    </span>
  )
}

function ResolveButton({ engine }: { engine: PrototypeEngine }) {
  return (
    <Button
      size='sm'
      variant={engine.resolved ? 'outline' : 'default'}
      className='h-8 text-xs'
      onClick={engine.toggleResolved}
    >
      {engine.resolved ? (
        <>
          <RotateCcw className='size-3.5' />
          Reabrir
        </>
      ) : (
        <>
          <CircleCheck className='size-3.5' />
          Resolver
        </>
      )}
    </Button>
  )
}

/** Reply / internal-note switch for the composer (notes stay in the thread). */
function useNoteComposer(engine: PrototypeEngine) {
  const [tab, setTab] = useState<'reply' | 'note'>('reply')
  const isNote = tab === 'note'

  const toolbar = (
    <div
      role='tablist'
      aria-label='Tipo de mensaje'
      className='flex gap-1 border-b px-2 pt-1.5'
    >
      {(
        [
          { value: 'reply', label: 'Responder', icon: MessageCircle },
          { value: 'note', label: 'Nota interna', icon: StickyNote },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type='button'
          role='tab'
          aria-selected={tab === option.value}
          onClick={() => setTab(option.value)}
          className={cn(
            'focus-visible:ring-ring -mb-px flex items-center gap-1.5 border-b-2 px-2 pb-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none',
            tab === option.value
              ? 'border-foreground text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          <option.icon className='size-3.5' aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  )

  return {
    isNote,
    composer: {
      onSend: isNote ? engine.addNote : engine.send,
      placeholder: isNote
        ? 'Nota interna: solo la ve tu equipo…'
        : 'Responder al cliente…',
      frameClassName: cn(
        isNote &&
          'border-chart-4/60 bg-chart-4/10 focus-within:border-chart-4 focus-within:ring-chart-4/30'
      ),
      toolbar,
    },
  }
}

function ResolvedNotice({ engine }: { engine: PrototypeEngine }) {
  if (!engine.resolved) return null
  return (
    <div className='bg-muted/50 text-muted-foreground flex items-center gap-2 border-t px-4 py-2 text-xs'>
      <CircleCheck className='size-3.5 shrink-0' aria-hidden />
      <span className='flex-1'>
        Caso resuelto. Si respondes o el cliente escribe, se reabre.
      </span>
      <button
        type='button'
        onClick={engine.toggleResolved}
        className='text-foreground focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none'
      >
        Reabrir
      </button>
    </div>
  )
}

/* D · Ticket ---------------------------------------------------------------- */

export function VariantD({ engine, mode }: VariantProps) {
  const notes = useNoteComposer(engine)

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='border-b'>
        <div className='flex items-start justify-between gap-3 px-4 pt-3 pb-2'>
          <div className='min-w-0'>
            <p className='text-muted-foreground flex items-center gap-2 text-xs'>
              <span className='font-mono'>#4821</span>
              <CaseStatusPill engine={engine} />
            </p>
            <h2 className='mt-1 truncate text-base font-semibold tracking-tight'>
              Cotización y pago · {CUSTOMER.displayName}
            </h2>
          </div>
          <div className='flex shrink-0 items-center gap-1'>
            <ResolveButton engine={engine} />
            <OptionsButton />
          </div>
        </div>

        <dl className='bg-muted/30 grid grid-cols-2 gap-x-6 gap-y-3 border-t px-4 py-2.5 sm:grid-cols-4'>
          <Property label='Responsable'>
            {engine.unassigned ? (
              <button
                type='button'
                onClick={engine.claim}
                className='text-foreground focus-visible:ring-ring rounded-sm underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:outline-none'
              >
                Asignarme
              </button>
            ) : (
              <span className='flex items-center gap-1.5'>
                <MemberAvatar />
                {MEMBER.displayName}
              </span>
            )}
          </Property>
          <Property label='Canal'>
            <span className='flex items-center gap-1.5'>
              <MessageCircle className='size-3.5' aria-hidden />
              WhatsApp
            </span>
          </Property>
          <Property label='Ventana 24 h'>
            <span className='tabular-nums'>{SERVICE_WINDOW_LEFT}</span>
          </Property>
          <Property label='Tono'>
            {mode === 'off' ? (
              <span className='text-muted-foreground'>—</span>
            ) : (
              <SentimentMarker
                sentiment={engine.sentiment}
                messages={engine.messages}
                mode={mode}
              />
            )}
          </Property>
        </dl>
      </header>

      <Thread
        messages={engine.messages}
        onRetry={engine.retry}
        loading={engine.threadLoading}
        layout='team'
        leading={
          <Marker className='justify-center text-xs'>
            <MarkerContent>
              Caso abierto desde WhatsApp por {CUSTOMER.displayName}
            </MarkerContent>
          </Marker>
        }
        contentClassName='mx-auto w-full max-w-3xl gap-4'
      />

      <ResolvedNotice engine={engine} />
      <Composer connected={engine.connected} {...notes.composer} />
    </div>
  )
}

/* E · Copiloto -------------------------------------------------------------- */

function CopilotSummary({ engine, mode }: VariantProps) {
  const tones = engine.messages
    .map((message) => messageTone(message))
    .filter((tone) => tone !== null)

  return (
    <section className='from-primary/10 via-card to-card rounded-xl border bg-gradient-to-br p-3.5'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='flex items-center gap-1.5 text-xs font-semibold'>
          <Sparkles className='size-3.5' aria-hidden />
          Resumen del copiloto
        </h3>
        {engine.unassigned && (
          <Button
            size='sm'
            variant='secondary'
            className='h-7 px-2.5 text-xs'
            onClick={engine.claim}
          >
            Tomar chat
          </Button>
        )}
      </div>
      <p className='text-foreground/90 mt-2 text-[13px] leading-relaxed'>
        Rosa pidió una cotización, preguntó si incluye IGV y envió una
        transferencia. El comprobante no se cargó y tu última respuesta falló:
        conviene reenviarla y pedir el comprobante.
      </p>
      {mode !== 'off' && tones.length > 0 && (
        <div className='mt-3 flex items-center gap-2'>
          <span className='text-muted-foreground text-[11px]'>
            Evolución del tono
          </span>
          <ol
            className='flex items-center gap-0.5'
            aria-label='Tono por mensaje'
          >
            {tones.map((tone, index) => {
              const meta = DOMINANT_META[tone]
              const Face = meta.icon
              return (
                <li key={index}>
                  <Face
                    className='size-3.5'
                    style={{ color: meta.color }}
                    aria-label={meta.label}
                  />
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

export function VariantE({ engine, mode }: VariantProps) {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <CustomerAvatar className='size-8' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>
              {CUSTOMER.displayName}
            </p>
            <p className='text-muted-foreground truncate text-xs'>
              {CUSTOMER.phone}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-1.5'>
          <SentimentBadge
            sentiment={engine.sentiment}
            messages={engine.messages}
            mode={mode}
          />
          <OptionsButton />
        </div>
      </header>

      <Thread
        messages={engine.messages}
        onRetry={engine.retry}
        loading={engine.threadLoading}
        palette='soft'
        leading={<CopilotSummary engine={engine} mode={mode} />}
        messageAddon={(message) => <ToneFace message={message} mode={mode} />}
        contentClassName='mx-auto w-full max-w-3xl'
      />

      <Composer
        connected={engine.connected}
        onSend={engine.send}
        placeholder='Escribe o elige una sugerencia…'
        above={(insert) => (
          <div className='mb-2.5 space-y-1.5'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium'>
              <Sparkles className='size-3' aria-hidden />
              Sugerencias
            </p>
            <div className='flex gap-1.5 overflow-x-auto pb-0.5'>
              {AI_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  onClick={() => insert(suggestion)}
                  className='bg-background text-muted-foreground hover:border-ring hover:text-foreground focus-visible:ring-ring w-56 shrink-0 rounded-lg border border-dashed px-2.5 py-2 text-start text-xs leading-snug transition-colors hover:border-solid focus-visible:ring-2 focus-visible:outline-none sm:w-auto sm:flex-1'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      />
    </div>
  )
}

/* F · Consola Pro (B layout + D case workflow, synced to the shipped surface) */

/**
 * ADR-0005 parity: the header, rail, quick replies and resolved notice mirror
 * the shipped case surface (`components/conversation/**`). Resolve and Options
 * ship present but disabled with "Próximamente" hints because the API has no
 * endpoints for them; the mock engine never makes them look functional.
 * Internal notes remain a prototype-only affordance.
 */

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

/** Status copy from the shipped STATUS_META; the mock reaches open/closed only. */
function ShippedStatusPill({ engine }: { engine: PrototypeEngine }) {
  const status = engine.resolved
    ? { label: 'Resuelto', className: 'bg-muted text-muted-foreground' }
    : { label: 'Abierto', className: 'bg-primary/15 text-foreground' }

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        status.className
      )}
    >
      {status.label}
    </span>
  )
}

/** Resolve maps to `status = closed`, but the API write path does not exist. */
function DisabledResolveButton() {
  return (
    <Button
      type='button'
      size='sm'
      className='h-11 w-11 justify-center rounded-full px-0 text-xs sm:h-8 sm:w-auto sm:px-3'
      disabled
      title='Próximamente: resolver el caso'
      aria-label='Resolver (próximamente)'
    >
      <CircleCheck className='size-3.5' />
      <span className='hidden sm:inline'>Resolver</span>
    </Button>
  )
}

/** Case actions have no API yet: present but disabled, never a working no-op. */
function DisabledOptionsButton() {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-11 sm:size-8'
      disabled
      title='Próximamente: más acciones del caso'
      aria-label='Más opciones (próximamente)'
    >
      <MoreVertical className='size-4' />
    </Button>
  )
}

/** Customer card exactly like the shipped rail: avatar, name and phone. */
function CaseCustomerCard() {
  return (
    <div className='flex flex-col items-center gap-2 border-b px-4 py-5 text-center'>
      <Avatar className='size-14'>
        <AvatarFallback className='text-base font-semibold'>
          {initials(CUSTOMER.displayName)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className='font-semibold'>{CUSTOMER.displayName}</p>
        <p className='text-muted-foreground flex items-center justify-center gap-1 text-xs'>
          <Phone className='size-3' aria-hidden />
          {CUSTOMER.phone}
        </p>
      </div>
    </div>
  )
}

/** Shipped drafts (quick-replies.tsx): greeting, quote and receipt request. */
const CASE_QUICK_REPLIES = [
  {
    label: 'Saludo',
    draft: '¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte?',
  },
  {
    label: 'Cotización',
    draft:
      'Te comparto la cotización solicitada. Quedo atento a cualquier consulta.',
  },
  {
    label: 'Comprobante',
    draft: '¿Podrías enviarnos el comprobante de pago, por favor?',
  },
] as const

function CaseQuickReplies({
  disabled,
  insert,
}: {
  disabled: boolean
  insert: (text: string) => void
}) {
  return (
    <div
      role='group'
      aria-label='Respuestas rápidas'
      className='mb-2 flex gap-2 overflow-x-auto pb-2'
    >
      {CASE_QUICK_REPLIES.map(({ label, draft }) => (
        <Button
          key={label}
          type='button'
          variant='outline'
          size='sm'
          disabled={disabled}
          title={draft}
          className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-8 sm:px-3'
          onClick={() => insert(draft)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Shipped copy of the remaining window, e.g. `14 h 32 min` / `45 min`. */
function formatWindowRemaining(remainingMs: number): string {
  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`

  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

/** Re-render once a minute so an open window flips to expired in place. */
function useMinuteNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  return now
}

/** Shipped service-window states, derived from the mock thread. */
function CaseWindowMeter({ messages }: { messages: PrototypeMessage[] }) {
  const now = useMinuteNow()
  let lastCustomerMs: number | undefined

  for (const message of messages) {
    if (message.sender.type !== 'customer') continue
    const timestamp = message.timestamp.getTime()
    if (lastCustomerMs === undefined || timestamp > lastCustomerMs) {
      lastCustomerMs = timestamp
    }
  }

  if (lastCustomerMs === undefined) {
    return (
      <p className='text-muted-foreground text-xs'>
        Aún no hay mensajes del cliente
      </p>
    )
  }

  const rawRemainingMs = SERVICE_WINDOW_MS - (now - lastCustomerMs)
  if (rawRemainingMs <= 0) {
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

  // Seed timestamps are fixed clock times, so early in the day they can sit
  // slightly ahead of `now`: clamp the display to a full window.
  const remainingMs = Math.min(rawRemainingMs, SERVICE_WINDOW_MS)

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between text-xs'>
        <span className='text-muted-foreground flex items-center gap-1.5'>
          <Clock3 className='size-3.5' aria-hidden />
          Ventana de 24 h
        </span>
        <span className='font-medium tabular-nums'>
          {formatWindowRemaining(remainingMs)}
        </span>
      </div>
      <div
        role='progressbar'
        aria-label='Ventana de 24 h restante'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((remainingMs / SERVICE_WINDOW_MS) * 100)}
        className='bg-muted h-1.5 overflow-hidden rounded-full'
      >
        <div
          className='bg-primary h-full rounded-full'
          style={{ width: `${(remainingMs / SERVICE_WINDOW_MS) * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Shipped resolved notice: same copy, Reopen disabled with the same hint. */
function CaseResolvedNotice() {
  return (
    <div className='bg-muted/50 mb-3 flex items-center gap-2.5 rounded-xl border p-3'>
      <span className='bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full'>
        <CircleCheck className='size-4' aria-hidden />
      </span>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <p className='text-sm font-medium'>Caso resuelto</p>
        <p className='text-muted-foreground text-xs'>
          Este caso está cerrado. Reábrelo para seguir respondiendo.
        </p>
      </div>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-8 sm:px-3'
        disabled
        title='Próximamente: reabrir el caso'
        aria-label='Reabrir (próximamente)'
      >
        <RotateCcw className='size-3.5' />
        Reabrir
      </Button>
    </div>
  )
}

export function VariantF({ engine, mode }: VariantProps) {
  const notes = useNoteComposer(engine)

  return (
    <div className='flex h-full min-h-0 flex-col lg:flex-row'>
      <div className='flex min-h-0 flex-1 flex-col'>
        <header className='bg-card flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <CustomerAvatar className='size-8 lg:size-9' />
            <div className='min-w-0'>
              <p className='flex items-center gap-2 text-sm'>
                <span className='truncate font-semibold'>
                  {CUSTOMER.displayName}
                </span>
                <ShippedStatusPill engine={engine} />
              </p>
              <p className='text-muted-foreground truncate text-xs'>
                <span className='font-mono'>#4821</span> · {CUSTOMER.phone}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-1.5'>
            <span className='lg:hidden'>
              <SentimentBadge
                sentiment={engine.sentiment}
                messages={engine.messages}
                mode={mode}
              />
            </span>
            {engine.unassigned && (
              <Button
                size='sm'
                variant='secondary'
                className='h-8 px-3 text-xs lg:hidden'
                onClick={engine.claim}
              >
                Tomar
              </Button>
            )}
            <DisabledResolveButton />
            <DisabledOptionsButton />
          </div>
        </header>

        <Thread
          messages={engine.messages}
          onRetry={engine.retry}
          loading={engine.threadLoading}
          layout='team'
          contentClassName='gap-4'
        />

        <Composer
          connected={engine.connected}
          {...notes.composer}
          above={
            engine.resolved
              ? () => <CaseResolvedNotice />
              : notes.isNote
                ? undefined
                : (insert) => (
                    <CaseQuickReplies
                      disabled={!engine.connected}
                      insert={insert}
                    />
                  )
          }
        />
      </div>

      <aside
        aria-label='Detalle del caso'
        className='bg-muted/30 hidden w-80 shrink-0 flex-col overflow-y-auto border-s lg:flex'
      >
        <CaseCustomerCard />

        {mode !== 'off' && (
          <RailSection title='Sentimiento'>
            <SentimentPanel
              sentiment={engine.sentiment}
              messages={engine.messages}
              mode={mode}
            />
          </RailSection>
        )}

        <RailSection title='Caso'>
          <dl className='space-y-1'>
            <RailRow label='Estado'>
              <ShippedStatusPill engine={engine} />
            </RailRow>
            <RailRow label='Responsable'>
              {engine.unassigned ? (
                <div className='space-y-1.5 text-end'>
                  <p className='text-muted-foreground text-xs'>Sin asignar</p>
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 px-2.5 text-xs'
                    onClick={engine.claim}
                  >
                    Tomar chat
                  </Button>
                </div>
              ) : (
                'Asignado a ti'
              )}
            </RailRow>
            {/* Prioridad: shipped renders it only when the conversation carries
                one; the mock carries none, so the row stays absent. */}
            <RailRow label='Canal'>
              <span className='flex items-center gap-1.5'>
                <MessageCircle className='size-3.5' aria-hidden />
                WhatsApp
              </span>
            </RailRow>
          </dl>
          <div className='pt-1'>
            <CaseWindowMeter messages={engine.messages} />
          </div>
        </RailSection>

        <p className='text-muted-foreground mt-auto px-4 py-3 text-[10px]'>
          Datos simulados: el prototipo no persiste nada.
        </p>
      </aside>
    </div>
  )
}
