/**
 * PROTOTYPE (disposable): mock data and types for the chat design comparator.
 *
 * In-memory only, no persistence: reloading the page resets the seed. Deleted
 * once a design is picked.
 */
import type { AttachmentStatus } from '@chat-crm/contracts'
import type { ChatMessage, ChatSentiment } from '../types/chat.domain'

export const PROTOTYPE_VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f'] as const
export type PrototypeVariant = (typeof PROTOTYPE_VARIANTS)[number]
export type SentimentMode = 'full' | 'mini' | 'off'

/**
 * One line per variant: each one bets on a different primary affordance, so
 * the comparison is about structure, not colour.
 */
export const VARIANT_META: Record<
  PrototypeVariant,
  { name: string; bet: string; frame: string }
> = {
  a: {
    name: 'Mensajería',
    bet: 'Familiar: fondo de chat, colas, hora dentro de la burbuja',
    frame: 'max-w-4xl',
  },
  b: {
    name: 'Consola',
    bet: 'Operativa: ficha del cliente, ventana 24 h y respuestas rápidas',
    frame: 'max-w-[1400px]',
  },
  c: {
    name: 'Enfoque',
    bet: 'Lectura: columna angosta, cero cromo, composer flotante',
    frame: 'max-w-3xl',
  },
  d: {
    name: 'Ticket',
    bet: 'Soporte: estado del caso, filas sin burbujas y nota interna',
    frame: 'max-w-5xl',
  },
  e: {
    name: 'Copiloto',
    bet: 'Asistido: tono por mensaje y respuestas sugeridas por IA',
    frame: 'max-w-5xl',
  },
  f: {
    name: 'Consola Pro',
    bet: 'B + D: consola con estado del caso, resolver y notas internas',
    frame: 'max-w-[1400px]',
  },
}

export type Tone = ChatSentiment['dominant']

/** Mock per-message tone (the IA service scores each customer message). */
const MESSAGE_TONES: Record<string, Tone> = {
  'p-1': 'NEU',
  'p-3': 'NEU',
  'p-4': 'NEG',
  'p-7': 'NEU',
  'p-9': 'NEU',
  'p-10': 'NEG',
}

export function messageTone(message: PrototypeMessage): Tone | null {
  if (message.sender.type !== 'customer') return null
  return message.tone ?? MESSAGE_TONES[message.id] ?? 'POS'
}

const TONE_SCORE: Record<Tone, number> = { POS: 1, NEU: 0, NEG: -1 }

export type ToneTrend = 'up' | 'down' | 'flat'

export interface ToneInsight {
  /** Customer messages with their tone, oldest first. */
  points: Array<{ message: PrototypeMessage; tone: Tone }>
  last: { message: PrototypeMessage; tone: Tone } | null
  /** Last 2 scored messages vs the 3 before them. */
  trend: ToneTrend
}

export function toneInsight(messages: PrototypeMessage[]): ToneInsight {
  const points = [...messages]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .flatMap((message) => {
      const tone = messageTone(message)
      return tone ? [{ message, tone }] : []
    })
  const average = (slice: typeof points) =>
    slice.reduce((sum, point) => sum + TONE_SCORE[point.tone], 0) / slice.length
  const recent = points.slice(-2)
  const earlier = points.slice(-5, -2)
  let trend: ToneTrend = 'flat'
  if (recent.length === 2 && earlier.length > 0) {
    const diff = average(recent) - average(earlier)
    if (diff >= 0.3) trend = 'up'
    else if (diff <= -0.3) trend = 'down'
  }
  return { points, last: points.at(-1) ?? null, trend }
}

/** Aggregate averages per dominant tone (the state panel switches them). */
export const SENTIMENT_PRESETS: Record<
  Tone,
  Pick<ChatSentiment, 'avgPos' | 'avgNeu' | 'avgNeg'>
> = {
  POS: { avgPos: 0.52, avgNeu: 0.31, avgNeg: 0.17 },
  NEU: { avgPos: 0.24, avgNeu: 0.58, avgNeg: 0.18 },
  NEG: { avgPos: 0.14, avgNeu: 0.27, avgNeg: 0.59 },
}

export const QUICK_REPLIES = [
  {
    label: 'Saludo',
    text: '¡Hola Rosa! Gracias por escribirnos, ¿en qué te ayudo?',
  },
  {
    label: 'Cotización',
    text: 'Te comparto la cotización actualizada en un momento.',
  },
  {
    label: 'Pago',
    text: '¿Me confirmas el número de operación de la transferencia?',
  },
  {
    label: 'Cierre',
    text: 'Quedo atento a cualquier otra consulta. ¡Buen día!',
  },
] as const

export const AI_SUGGESTIONS = [
  'Sí, todos los precios incluyen IGV. ¿Deseas que te reserve el pedido?',
  'Recibí tu transferencia, la estoy validando y te confirmo en unos minutos.',
  'El comprobante no se cargó bien, ¿podrías reenviarlo por favor?',
] as const

/** Customer-facing 24 h service window, counted from the last inbound. */
export const SERVICE_WINDOW_LEFT = '14 h 32 min'

export interface PrototypeMessage extends Omit<ChatMessage, 'msg'> {
  msg: ChatMessage['msg'] & {
    /** v2 attachment lifecycle: pending -> ready | failed. */
    attachmentStatus?: AttachmentStatus | null
  }
  /** Internal note: written by a member, never sent to the customer. */
  internal?: boolean
  /** Mock IA score for simulated inbound messages. */
  tone?: Tone
}

/** Narrowed content view used by the render pieces (real contract type). */
export function getPrototypeContent(message: PrototypeMessage): {
  body?: string
  caption?: string
  filename?: string
} {
  const content = message.msg.content
  return {
    body: 'body' in content ? content.body : undefined,
    caption: 'caption' in content ? content.caption : undefined,
    filename: 'filename' in content ? content.filename : undefined,
  }
}

/** Avatar initials: "Rosa Medina" -> "RM". */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const PROTOTYPE_CONVERSATION_ID = 'prototype-conversation'

export const CUSTOMER = {
  id: 'customer-1',
  displayName: 'Rosa Medina',
  phone: '+51 987 654 321',
} as const

export const MEMBER = {
  id: 'member-1',
  displayName: 'Aron Chancan',
} as const

export const IMAGE_READY_URL = 'https://picsum.photos/seed/crm-chat/720/480'

export const SEED_SENTIMENT: ChatSentiment = {
  avgPos: 0.52,
  avgNeu: 0.31,
  avgNeg: 0.17,
  totalMessages: 48,
  dominant: 'POS',
}

function seedTimestamp(daysAgo: number, hours: number, minutes: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function seedMessages(): PrototypeMessage[] {
  const rows: Omit<PrototypeMessage, 'conversationId'>[] = [
    // Yesterday
    {
      id: 'p-1',
      timestamp: seedTimestamp(1, 15, 40),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: 'Hola, ¿me pueden ayudar con mi pedido?' },
      },
    },
    {
      id: 'p-2',
      timestamp: seedTimestamp(1, 15, 42),
      status: 'read',
      sender: { id: MEMBER.id, type: 'member' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: '¡Hola Rosa! Claro que sí, cuéntame.' },
      },
    },
    // Today
    {
      id: 'p-3',
      timestamp: seedTimestamp(0, 9, 12),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: 'Buenos días, sigo esperando la cotización 🙏' },
      },
    },
    {
      id: 'p-4',
      timestamp: seedTimestamp(0, 9, 13),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: '¿La pueden enviar hoy?' },
      },
    },
    {
      id: 'p-5',
      timestamp: seedTimestamp(0, 9, 15),
      status: 'read',
      sender: { id: MEMBER.id, type: 'member' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: 'Buenos días, la estoy preparando.' },
      },
    },
    {
      id: 'p-6',
      timestamp: seedTimestamp(0, 9, 16),
      status: 'read',
      sender: { id: MEMBER.id, type: 'member' },
      msg: {
        type: 'document',
        mediaUrl: null,
        attachmentStatus: 'ready',
        content: {
          caption: 'Aquí va la cotización actualizada.',
          filename: 'cotizacion-rosa.pdf',
        },
      },
    },
    {
      id: 'p-7',
      timestamp: seedTimestamp(0, 9, 20),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'image',
        mediaUrl: IMAGE_READY_URL,
        attachmentStatus: 'ready',
        content: { caption: '¿Estos precios incluyen IGV?' },
      },
    },
    {
      id: 'p-8',
      timestamp: seedTimestamp(0, 9, 22),
      status: 'failed',
      sender: { id: MEMBER.id, type: 'member' },
      msg: {
        type: 'text',
        mediaUrl: null,
        attachmentStatus: null,
        content: { body: 'Sí, todos los precios incluyen IGV.' },
      },
    },
    {
      id: 'p-9',
      timestamp: seedTimestamp(0, 9, 25),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'image',
        mediaUrl: null,
        attachmentStatus: 'pending',
        content: { caption: 'transferencia.jpg' },
      },
    },
    {
      id: 'p-10',
      timestamp: seedTimestamp(0, 9, 26),
      status: 'read',
      sender: { id: CUSTOMER.id, type: 'customer' },
      msg: {
        type: 'document',
        mediaUrl: null,
        attachmentStatus: 'failed',
        content: { filename: 'comprobante-pago.pdf' },
      },
    },
  ]

  return rows.map((row) => ({
    ...row,
    conversationId: PROTOTYPE_CONVERSATION_ID,
  }))
}
