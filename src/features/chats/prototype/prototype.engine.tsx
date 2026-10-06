/**
 * PROTOTYPE (disposable): mock engine for the chat v2 comparator.
 *
 * Simulates what the socket and backend will do in production: optimistic send
 * (pending -> sent -> delivered -> read), failure with retry, async attachments
 * (pending -> ready | failed) and error toasts. In-memory only.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CloudAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatSentiment } from '../types/chat.domain'
import {
  CUSTOMER,
  IMAGE_READY_URL,
  MEMBER,
  PROTOTYPE_CONVERSATION_ID,
  SEED_SENTIMENT,
  SENTIMENT_PRESETS,
  seedMessages,
  type PrototypeMessage,
  type Tone,
} from './prototype.data'

type MessageStatusValue = PrototypeMessage['status']

const INCOMING: Array<{ text: string; tone: Tone }> = [
  { text: '¿Me confirmas el stock del modelo B?', tone: 'NEU' },
  { text: '¿Por qué tarda tanto? Ya pagué hace una hora 😤', tone: 'NEG' },
  { text: 'Perfecto, quedo atenta 🙌', tone: 'POS' },
  { text: '¿Hacen envíos a provincia?', tone: 'NEU' },
  { text: 'Gracias por la información, muy amables.', tone: 'POS' },
]

export function usePrototypeEngine() {
  const [messages, setMessages] = useState(seedMessages)
  const [connected, setConnected] = useState(true)
  const [unassigned, setUnassigned] = useState(true)
  const [resolved, setResolved] = useState(false)
  const [failNext, setFailNext] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sentiment, setSentiment] = useState<ChatSentiment>(SEED_SENTIMENT)

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const incomingIndex = useRef(0)

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }, [])

  useEffect(() => {
    const active = timers.current
    return () => {
      active.forEach((timer) => clearTimeout(timer))
      active.clear()
    }
  }, [])

  const patchStatus = useCallback((id: string, status: MessageStatusValue) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, status } : message
      )
    )
  }, [])

  const runDelivery = useCallback(
    (id: string) => {
      later(() => patchStatus(id, 'sent'), 650)
      later(() => patchStatus(id, 'delivered'), 1700)
      later(() => patchStatus(id, 'read'), 3200)
    },
    [later, patchStatus]
  )

  const send = useCallback(
    (body: string) => {
      const text = body.trim()
      if (!text || !connected) return

      // Replying to the customer reopens a resolved case.
      setResolved(false)
      const id = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        {
          id,
          conversationId: PROTOTYPE_CONVERSATION_ID,
          timestamp: new Date(),
          status: 'pending',
          sender: { id: MEMBER.id, type: 'member' },
          msg: {
            type: 'text',
            mediaUrl: null,
            attachmentStatus: null,
            content: { body: text },
          },
        },
      ])

      if (failNext) {
        setFailNext(false)
        later(() => patchStatus(id, 'failed'), 900)
        return
      }

      runDelivery(id)
    },
    [connected, failNext, later, patchStatus, runDelivery]
  )

  const retry = useCallback(
    (id: string) => {
      patchStatus(id, 'pending')
      runDelivery(id)
    },
    [patchStatus, runDelivery]
  )

  const addNote = useCallback((body: string) => {
    const text = body.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversationId: PROTOTYPE_CONVERSATION_ID,
        timestamp: new Date(),
        status: 'read',
        internal: true,
        sender: { id: MEMBER.id, type: 'member' },
        msg: {
          type: 'text',
          mediaUrl: null,
          attachmentStatus: null,
          content: { body: text },
        },
      },
    ])
  }, [])

  const simulateIncoming = useCallback(() => {
    const incoming = INCOMING[incomingIndex.current % INCOMING.length] ?? {
      text: 'Mensaje de prueba',
      tone: 'NEU' as const,
    }
    incomingIndex.current += 1

    // A customer writing again reopens a resolved case.
    setResolved(false)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversationId: PROTOTYPE_CONVERSATION_ID,
        timestamp: new Date(),
        status: 'read',
        tone: incoming.tone,
        sender: { id: CUSTOMER.id, type: 'customer' },
        msg: {
          type: 'text',
          mediaUrl: null,
          attachmentStatus: null,
          content: { body: incoming.text },
        },
      },
    ])
  }, [])

  const simulateThreadLoading = useCallback(() => {
    setThreadLoading(true)
    later(() => setThreadLoading(false), 1400)
  }, [later])

  const clearThread = useCallback(() => setMessages([]), [])

  const resolveAttachment = useCallback((status: 'ready' | 'failed') => {
    setMessages((prev) => {
      const index = prev.findIndex(
        (message) => message.msg.attachmentStatus === 'pending'
      )
      const current = prev[index]
      if (index === -1 || !current) return prev

      const next = [...prev]
      next[index] = {
        ...current,
        msg: {
          ...current.msg,
          attachmentStatus: status,
          mediaUrl: status === 'ready' ? IMAGE_READY_URL : null,
        },
      }
      return next
    })
  }, [])

  const claim = useCallback(() => setUnassigned(false), [])

  const toggleResolved = useCallback(() => setResolved((prev) => !prev), [])

  const setDominant = useCallback((dominant: ChatSentiment['dominant']) => {
    setSentiment((prev) => ({
      ...prev,
      ...SENTIMENT_PRESETS[dominant],
      dominant,
    }))
  }, [])

  const toggleFailNext = useCallback(() => setFailNext((prev) => !prev), [])

  const simulateTemplateError = useCallback(() => {
    toast.error('Ventana de 24 h cerrada (mock)', {
      description:
        'El cliente no puede recibir mensajes libres todavía. Envía una plantilla para retomar la conversación.',
      action: {
        label: 'Enviar plantilla',
        onClick: () => toast.info('Plantilla enviada (mock).'),
      },
      closeButton: true,
      duration: Infinity,
      position: 'top-right',
    })
  }, [])

  const simulateSimpleError = useCallback(() => {
    toast('No se pudo entregar el mensaje (mock)', {
      description:
        'El proveedor rechazó el envío. Puedes reintentar desde la burbuja.',
      icon: <CloudAlert className='size-4' />,
      position: 'top-right',
    })
  }, [])

  const reset = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer))
    timers.current.clear()
    setMessages(seedMessages())
    setConnected(true)
    setUnassigned(true)
    setResolved(false)
    setFailNext(false)
    setThreadLoading(false)
    setSentiment(SEED_SENTIMENT)
    incomingIndex.current = 0
  }, [])

  return {
    messages,
    connected,
    unassigned,
    resolved,
    failNext,
    threadLoading,
    sentiment,
    send,
    addNote,
    retry,
    simulateIncoming,
    simulateThreadLoading,
    clearThread,
    resolveAttachment,
    simulateTemplateError,
    simulateSimpleError,
    setConnected,
    claim,
    toggleResolved,
    setDominant,
    toggleFailNext,
    reset,
  }
}

export type PrototypeEngine = ReturnType<typeof usePrototypeEngine>
