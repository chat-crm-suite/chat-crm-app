import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react'
import type { ChatSentiment } from '../../types/chat.domain'

/**
 * Face per tone, colored with the theme tokens. Tone never shares a shape
 * with connection status (Wifi) or message ticks (checks).
 */
export const TONE_META: Record<
  ChatSentiment['dominant'],
  { label: string; color: string; icon: LucideIcon }
> = {
  POS: { label: 'Positivo', color: 'var(--positive)', icon: Smile },
  NEU: { label: 'Neutral', color: 'var(--neutro)', icon: Meh },
  NEG: { label: 'Negativo', color: 'var(--negative)', icon: Frown },
}

export function shares(sentiment: ChatSentiment) {
  return [
    { tone: 'POS', value: sentiment.avgPos },
    { tone: 'NEU', value: sentiment.avgNeu },
    { tone: 'NEG', value: sentiment.avgNeg },
  ] as const
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`
}
