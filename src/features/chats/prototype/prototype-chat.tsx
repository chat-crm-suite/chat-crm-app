/**
 * PROTOTYPE (disposable): shell for the chat v2 design comparator.
 *
 * Route: `/prototype-chat?variant=a|b|c|d|e|f&sentiment=full|mini|off`.
 * Floating bar at the bottom switches design variant (arrows or ←/→ keys) and
 * sentiment mode; the state panel exposes the whole simulation (connection,
 * tone, actions and the message list). Deleted once a design is picked.
 */
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  PROTOTYPE_VARIANTS,
  VARIANT_META,
  type PrototypeVariant,
  type SentimentMode,
} from './prototype.data'
import { usePrototypeEngine, type PrototypeEngine } from './prototype.engine'
import {
  VariantA,
  VariantB,
  VariantC,
  VariantD,
  VariantE,
  VariantF,
} from './prototype.variants'

const VARIANT_COMPONENTS = {
  a: VariantA,
  b: VariantB,
  c: VariantC,
  d: VariantD,
  e: VariantE,
  f: VariantF,
} as const

const STATUS_LABELS = {
  pending: 'Enviando…',
  sent: 'Enviado',
  delivered: 'Entregado',
  read: 'Leído',
  failed: 'Falló',
} as const

const ATTACHMENT_LABELS = {
  pending: 'cargando',
  ready: 'listo',
  failed: 'sin archivo',
} as const

const MODE_LABELS = {
  full: 'Completo',
  mini: 'Mini',
  off: 'Apagado',
} as const

export function PrototypeChat({
  variant,
  sentiment,
  onVariantChange,
  onSentimentChange,
}: {
  variant: PrototypeVariant
  sentiment: SentimentMode
  onVariantChange: (variant: PrototypeVariant) => void
  onSentimentChange: (mode: SentimentMode) => void
}) {
  const engine = usePrototypeEngine()
  const [panelOpen, setPanelOpen] = useState(false)
  const Variant = VARIANT_COMPONENTS[variant]

  const cycle = (step: 1 | -1) => {
    const index = PROTOTYPE_VARIANTS.indexOf(variant)
    const count = PROTOTYPE_VARIANTS.length
    const next = PROTOTYPE_VARIANTS[(index + step + count) % count]
    if (next) onVariantChange(next)
  }
  const cycleRef = useRef(cycle)
  useEffect(() => {
    cycleRef.current = cycle
  })

  // ←/→ cycle variants, except while typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      event.preventDefault()
      cycleRef.current(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className='bg-muted/40 selection:bg-primary/25 selection:text-foreground min-h-dvh'>
      <div className='mx-auto flex h-dvh flex-col px-3 pt-3 pb-32 sm:px-6 sm:pb-28'>
        <div
          key={variant}
          className={cn(
            'bg-card motion-safe:animate-in motion-safe:fade-in-0 mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border shadow-sm motion-safe:duration-200',
            VARIANT_META[variant].frame
          )}
        >
          <Variant engine={engine} mode={sentiment} />
        </div>
      </div>

      <FloatingBar
        variant={variant}
        sentiment={sentiment}
        panelOpen={panelOpen}
        onVariantChange={onVariantChange}
        onCycle={cycle}
        onSentimentChange={onSentimentChange}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />

      {panelOpen && (
        <StatePanel
          engine={engine}
          variant={variant}
          mode={sentiment}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}

/* Floating bar -------------------------------------------------------------- */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{
    value: T
    label: string
    shortLabel?: string
    description?: string
  }>
  onChange: (value: T) => void
}) {
  return (
    <div className='flex min-w-0 items-center gap-1.5'>
      <span className='text-muted-foreground hidden text-xs xl:inline'>
        {label}
      </span>
      <div
        role='radiogroup'
        aria-label={label}
        className='bg-background flex items-center gap-0.5 rounded-full border p-0.5'
      >
        {options.map((option) => (
          <button
            key={option.value}
            type='button'
            role='radio'
            aria-checked={value === option.value}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-ring rounded-full px-2 py-1 text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-2.5 sm:py-1.5 sm:text-xs',
              value === option.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.shortLabel ? (
              <>
                <span className='sm:hidden'>{option.shortLabel}</span>
                <span className='hidden sm:inline'>{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function FloatingBar({
  variant,
  sentiment,
  panelOpen,
  onVariantChange,
  onCycle,
  onSentimentChange,
  onTogglePanel,
}: {
  variant: PrototypeVariant
  sentiment: SentimentMode
  panelOpen: boolean
  onVariantChange: (variant: PrototypeVariant) => void
  onCycle: (step: 1 | -1) => void
  onSentimentChange: (mode: SentimentMode) => void
  onTogglePanel: () => void
}) {
  const meta = VARIANT_META[variant]

  // Inverted (foreground) surface so it never reads as part of the design.
  return (
    <div className='dark fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 sm:bottom-4'>
      <div className='bg-popover text-popover-foreground flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border px-2.5 py-2 shadow-2xl sm:px-3 lg:flex-nowrap lg:rounded-full'>
        <div className='flex min-w-0 items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 shrink-0 rounded-full'
            onClick={() => onCycle(-1)}
            aria-label='Variante anterior (←)'
          >
            <ChevronLeft className='size-4' />
          </Button>
          <div
            className='min-w-0 px-1 text-center sm:w-52 xl:w-72'
            aria-live='polite'
          >
            <p className='flex items-center justify-center gap-1.5 text-sm font-medium'>
              <FlaskConical className='text-muted-foreground size-3.5 shrink-0' />
              <span className='text-muted-foreground font-mono'>
                {variant.toUpperCase()}
              </span>
              {meta.name}
            </p>
            <p className='text-muted-foreground hidden truncate text-[11px] sm:block'>
              {meta.bet}
            </p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 shrink-0 rounded-full'
            onClick={() => onCycle(1)}
            aria-label='Variante siguiente (→)'
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
        <Separator orientation='vertical' className='hidden h-6 sm:block' />
        <Segmented
          label='Diseño'
          value={variant}
          onChange={onVariantChange}
          options={PROTOTYPE_VARIANTS.map((key) => ({
            value: key,
            label: key.toUpperCase(),
            description: `${VARIANT_META[key].name}: ${VARIANT_META[key].bet}`,
          }))}
        />
        <Segmented
          label='Sentimiento'
          value={sentiment}
          onChange={onSentimentChange}
          options={[
            { value: 'full', label: 'Completo', shortLabel: 'Sí' },
            { value: 'mini', label: 'Mini' },
            { value: 'off', label: 'Apagado', shortLabel: 'No' },
          ]}
        />
        <Separator orientation='vertical' className='hidden h-5 sm:block' />
        <Button
          variant={panelOpen ? 'secondary' : 'outline'}
          size='sm'
          className='h-8 rounded-full px-2.5 text-xs sm:px-3'
          onClick={onTogglePanel}
          aria-expanded={panelOpen}
        >
          <SlidersHorizontal className='size-3.5' />
          <span className='hidden xl:inline'>Estado</span>
          <span className='sr-only xl:hidden'>Estado</span>
        </Button>
      </div>
    </div>
  )
}

/* State panel --------------------------------------------------------------- */

function StatePanel({
  engine,
  variant,
  mode,
  onClose,
}: {
  engine: PrototypeEngine
  variant: PrototypeVariant
  mode: SentimentMode
  onClose: () => void
}) {
  return (
    <aside className='bg-popover fixed top-4 bottom-28 left-4 z-40 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border shadow-xl sm:bottom-24'>
      <header className='flex items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-2'>
          <FlaskConical className='size-4' />
          <h2 className='text-sm font-medium'>Estado de la simulación</h2>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='size-7'
          onClick={onClose}
          aria-label='Cerrar panel de estado'
        >
          <X className='size-4' />
        </Button>
      </header>

      <div className='min-h-0 flex-1 space-y-5 overflow-y-auto p-4'>
        <section className='space-y-2'>
          <h3 className='text-muted-foreground text-xs font-medium'>
            Conexión
          </h3>
          <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
            <span className='flex items-center gap-2 text-xs'>
              {engine.connected ? (
                <Wifi className='size-3.5 text-[var(--positive)]' aria-hidden />
              ) : (
                <WifiOff className='text-destructive size-3.5' aria-hidden />
              )}
              {engine.connected ? 'Conectado' : 'Desconectado'}
            </span>
            <Button
              size='sm'
              variant='outline'
              className='h-7 text-xs'
              onClick={() => engine.setConnected(!engine.connected)}
            >
              {engine.connected ? 'Desconectar' : 'Reconectar'}
            </Button>
          </div>
          <p className='text-muted-foreground text-xs'>
            Desconectado: el composer queda en «Reconectando…» y los envíos se
            bloquean.
          </p>
        </section>

        <section className='space-y-2'>
          <h3 className='text-muted-foreground text-xs font-medium'>
            Tono dominante
          </h3>
          <div className='flex gap-1'>
            {(['POS', 'NEU', 'NEG'] as const).map((dominant) => (
              <Button
                key={dominant}
                size='sm'
                variant={
                  engine.sentiment.dominant === dominant ? 'default' : 'outline'
                }
                className='h-7 flex-1 text-xs'
                onClick={() => engine.setDominant(dominant)}
              >
                {dominant}
              </Button>
            ))}
          </div>
          <p className='text-muted-foreground text-xs'>
            Diseño {variant.toUpperCase()} · {VARIANT_META[variant].name} ·
            Sentimiento {MODE_LABELS[mode]}. «Mensaje entrante» alterna tonos:
            el 2.º es negativo y dispara la alerta y la tendencia.
          </p>
        </section>

        <section className='space-y-2'>
          <h3 className='text-muted-foreground text-xs font-medium'>Caso</h3>
          <div className='flex items-center justify-between rounded-lg border px-3 py-2 text-xs'>
            <span>
              {engine.resolved
                ? 'Resuelto'
                : engine.unassigned
                  ? 'Nuevo · sin asignar'
                  : 'Abierto · asignado'}
            </span>
            <Button
              size='sm'
              variant='outline'
              className='h-7 text-xs'
              onClick={engine.toggleResolved}
            >
              {engine.resolved ? 'Reabrir' : 'Resolver'}
            </Button>
          </div>
        </section>

        <section className='space-y-2'>
          <h3 className='text-muted-foreground text-xs font-medium'>
            Acciones
          </h3>
          <div className='grid grid-cols-2 gap-1.5'>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={engine.simulateIncoming}
            >
              Mensaje entrante
            </Button>
            <Button
              size='sm'
              variant={engine.failNext ? 'default' : 'outline'}
              className='h-8 text-xs'
              onClick={engine.toggleFailNext}
            >
              {engine.failNext ? 'Fallará ✓' : 'Fallar envío'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={() => engine.resolveAttachment('ready')}
            >
              Adjunto → listo
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={() => engine.resolveAttachment('failed')}
            >
              Adjunto → fallido
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={engine.simulateTemplateError}
            >
              Error + plantilla
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={engine.simulateSimpleError}
            >
              Error simple
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={engine.clearThread}
            >
              Vaciar hilo
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={engine.simulateThreadLoading}
            >
              Cargar hilo
            </Button>
          </div>
          <Button
            size='sm'
            variant='ghost'
            className='w-full text-xs'
            onClick={engine.reset}
          >
            Reiniciar simulación
          </Button>
        </section>

        <section className='space-y-2'>
          <h3 className='text-muted-foreground text-xs font-medium'>
            Mensajes ({engine.messages.length})
          </h3>
          <ul className='space-y-1 font-mono text-[11px] leading-relaxed'>
            {engine.messages.map((message) => (
              <li key={message.id} className='flex items-baseline gap-1.5'>
                <span className='text-muted-foreground tabular-nums'>
                  {format(message.timestamp, 'HH:mm')}
                </span>
                <span>{message.sender.type === 'member' ? 'me' : 'cli'}</span>
                <span className='truncate'>
                  {message.internal ? 'nota' : message.msg.type}
                </span>
                <span className='text-muted-foreground'>
                  {STATUS_LABELS[message.status]}
                </span>
                {message.msg.attachmentStatus && (
                  <span className='text-muted-foreground'>
                    adj:{ATTACHMENT_LABELS[message.msg.attachmentStatus]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className='text-muted-foreground text-xs'>
          En memoria: recargar vuelve al estado inicial. Sube en el hilo y pulsa
          «Mensaje entrante» para ver el botón de nuevos mensajes.
        </p>
      </div>
    </aside>
  )
}
