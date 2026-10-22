import type { SVGProps } from 'react'
import type { ChannelType } from '@chat-crm/contracts'
import {
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  MessageSquareText,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHANNEL_LABEL } from '../copy'

/** WhatsApp glyph without an SVG `<title>` (the chip carries the name). */
function WhatsappGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <path d='M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9' />
      <path d='M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1' />
    </svg>
  )
}

const ICONS: Record<ChannelType, LucideIcon | typeof WhatsappGlyph> = {
  whatsapp: WhatsappGlyph,
  telegram: Send,
  messenger: MessageCircle,
  instagram: Instagram,
  email: Mail,
  sms: MessageSquareText,
  webchat: Globe,
}

/** Decorative channel glyph; pair it with visible text or an `aria-label`. */
export function ChannelIcon({
  type,
  className,
}: {
  type: ChannelType
  className?: string
}) {
  const Icon = ICONS[type] ?? MessageCircle
  return <Icon aria-hidden className={cn('size-3.5 shrink-0', className)} />
}

/** Small outlined chip: glyph + channel name (or the type label). */
export function ChannelChip({
  type,
  name,
  className,
}: {
  type: ChannelType
  name?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'text-muted-foreground inline-flex h-5 max-w-40 items-center gap-1 rounded-full border px-1.5 text-[11px] font-medium',
        className
      )}
    >
      <ChannelIcon type={type} className='size-3' />
      <span className='truncate'>{name || CHANNEL_LABEL[type]}</span>
    </span>
  )
}
