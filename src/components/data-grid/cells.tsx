import type { ReactNode } from 'react'
import { AVATAR_TINTS, tintIndex } from '@/features/chats/lib/monogram'
import { cn } from '@/lib/utils'
import { initialsOf, relativeTime } from './format'

type AvatarProps = {
  name?: string | null
  fallback?: string | null
  /** Stable key for the tint (an id), so the colour never changes on rename. */
  tintKey: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const AVATAR_SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
} as const

/** Monogram avatar tinted from the shared `--avatar-tint-*` tokens. */
export function MonogramAvatar({
  name,
  fallback,
  tintKey,
  src,
  size = 'md',
  className,
}: AvatarProps) {
  const tint = (tintIndex(tintKey) % AVATAR_TINTS) + 1

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none',
        AVATAR_SIZES[size],
        className
      )}
      style={{
        backgroundColor: `var(--avatar-tint-${tint}-bg)`,
        color: `var(--avatar-tint-${tint}-fg)`,
      }}
    >
      {src ? (
        <img src={src} alt='' className='size-full object-cover' />
      ) : (
        initialsOf(name, fallback)
      )}
    </span>
  )
}

type IdentityCellProps = AvatarProps & {
  /** Main line: the thing people scan for. */
  title: ReactNode
  /** Quiet second line: @username, phone, email. */
  subtitle?: ReactNode
  /** Small marker next to the title (e.g. "Tú"). */
  badge?: ReactNode
}

/** Avatar + two stacked lines; the first column of every people table. */
export function IdentityCell({
  title,
  subtitle,
  badge,
  ...avatar
}: IdentityCellProps) {
  return (
    <div className='flex min-w-0 items-center gap-3'>
      <MonogramAvatar {...avatar} />
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span className='truncate text-sm leading-5 font-medium'>
            {title}
          </span>
          {badge}
        </div>
        {subtitle ? (
          <div className='text-muted-foreground truncate text-[13px] leading-4'>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export type Tone = 'positive' | 'warning' | 'negative' | 'neutral' | 'info'

const TONE_DOT: Record<Tone, string> = {
  positive: 'bg-[var(--positive)]',
  warning: 'bg-[var(--warning)]',
  negative: 'bg-[var(--negative)]',
  neutral: 'bg-[var(--neutro)]/60',
  info: 'bg-[var(--spend)]',
}

/** Status as a dot plus a word: readable without colour, lighter than a pill. */
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', TONE_DOT[tone])}
      />
      {children}
    </span>
  )
}

/** Live presence marker; only "available" pulses, and never under reduced motion. */
export function PresenceDot({
  state,
  label,
}: {
  state: 'available' | 'away' | 'offline'
  label: string
}) {
  const tone: Tone =
    state === 'available' ? 'positive' : state === 'away' ? 'warning' : 'neutral'

  return (
    <span className='inline-flex items-center gap-2 text-sm'>
      <span className='relative flex size-2'>
        {state === 'available' ? (
          <span
            aria-hidden
            className='absolute inline-flex size-full rounded-full bg-[var(--positive)] opacity-50 motion-safe:animate-ping'
          />
        ) : null}
        <span
          aria-hidden
          className={cn('relative size-2 rounded-full', TONE_DOT[tone])}
        />
      </span>
      <span className={state === 'offline' ? 'text-muted-foreground' : ''}>
        {label}
      </span>
    </span>
  )
}

/** Quiet outlined tag: roles, sources, labels that classify but do not alarm. */
export function Chip({
  icon,
  children,
  className,
  style,
}: {
  icon?: ReactNode
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      style={style}
      className={cn(
        'text-foreground/80 inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
        className
      )}
    >
      {icon}
      <span className='truncate'>{children}</span>
    </span>
  )
}

/** Load as a number plus a thin bar; turns amber/red as it fills up. */
export function Meter({
  value,
  max,
  label,
}: {
  value: number
  max: number | null
  label: string
}) {
  const ratio = max && max > 0 ? Math.min(value / max, 1) : 0
  const tone =
    ratio >= 1
      ? 'bg-[var(--negative)]'
      : ratio >= 0.8
        ? 'bg-[var(--warning)]'
        : 'bg-primary'

  return (
    <div className='flex items-center gap-3' title={label}>
      <span className='w-12 text-sm tabular-nums'>
        {value}
        <span className='text-muted-foreground'>
          {max ? ` / ${max}` : ' / ∞'}
        </span>
      </span>
      {max ? (
        <span
          role='meter'
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          className='bg-muted hidden h-1 w-16 overflow-hidden rounded-full sm:block'
        >
          <span
            className={cn('block h-full rounded-full', tone)}
            style={{ width: `${ratio * 100}%` }}
          />
        </span>
      ) : null}
    </div>
  )
}

/** Relative text with the exact moment on hover/focus (title attribute). */
export function RelativeTime({
  date,
  empty = 'Nunca',
}: {
  date?: Date | string | null
  empty?: string
}) {
  if (!date) return <span className='text-muted-foreground'>{empty}</span>

  const value = new Date(date)
  return (
    <time
      dateTime={value.toISOString()}
      title={value.toLocaleString('es')}
      className='text-muted-foreground text-sm whitespace-nowrap'
    >
      {relativeTime(value)}
    </time>
  )
}

/**
 * Hover-revealed container for row actions. Always visible on touch devices
 * and while focused, so keyboard users never lose them.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div
      data-no-row-click
      className='flex justify-end gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100'
    >
      {children}
    </div>
  )
}
