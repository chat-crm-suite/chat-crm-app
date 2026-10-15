import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  SendMessageAckSchema,
  type ConversationMessageAttachmentPatch,
  type ConversationMessageStatusPatch,
  type MessageSenderType,
  type SendConversationMessageInput,
  type SendMessageErrorCode,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { useSocket } from '@/context/socket-provider'
import { api } from '../api'
import {
  hasFile,
  optimisticView,
  toOutgoingMessage,
  uploadKindOf,
  type OutgoingDraft,
} from '../lib/outgoing-draft'
import { uploadErrorMessage } from '../lib/upload-errors'
import {
  applyAttachmentPatch,
  applyStatusPatch,
  applyUploadProgress,
  markMessageFailed,
  markMessagePending,
  sortChronologically,
  upsertMessage,
} from '../lib/thread-state'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents as Events } from '../types/socket.api'

/** Send context of the open conversation (company and acting member). */
export interface ChatThreadIdentity {
  companyId?: string | null
  sender: { id: string; type: MessageSenderType }
}

/** How long a send waits for the API to confirm it is queued. */
export const SEND_ACK_TIMEOUT_MS = 8000
/** Files uploading at once; sends still leave in the order they were asked. */
const MAX_PARALLEL_UPLOADS = 3

const ACK_ERRORS: Record<SendMessageErrorCode | 'timeout', string> = {
  forbidden: 'Ya no tienes acceso a esta conversación.',
  validation: 'El mensaje no es válido.',
  not_found: 'La conversación ya no existe.',
  internal: 'El servidor no pudo encolar el mensaje. Inténtalo de nuevo.',
  timeout: 'Sin respuesta del servidor. Revisa tu conexión y reintenta.',
}

/** One send this client owns: what was asked and how far it got. */
interface OutboxEntry {
  draft: OutgoingDraft
  /** Set once the file is staged (or right away for text): retries reuse it. */
  payload?: SendConversationMessageInput
  previewUrl?: string
}

/**
 * Owns the message cache of the open conversation: REST history, optimistic
 * sends (text and files), live reconciliation and room membership. The list
 * preview stays in `Chats` (it listens to the broadcast for every chat).
 */
export function useChatThread(
  conversationId: string | undefined,
  identity: ChatThreadIdentity
) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { companyId, sender } = identity
  const senderId = sender.id
  const senderType = sender.type

  const outbox = useRef(new Map<string, OutboxEntry>())
  /** Sends are emitted one after another, in the order they were asked. */
  const sendChain = useRef<Promise<void>>(Promise.resolve())
  const uploadSlots = useRef(createSlots(MAX_PARALLEL_UPLOADS))

  const query = useQuery({
    queryKey: ['chat', conversationId, 'messages'],
    queryFn: () => api.queries.messages.get(conversationId as string),
    enabled: !!conversationId,
    select: sortChronologically,
  })

  const updateThread = useCallback(
    (update: (messages: ChatMessage[]) => ChatMessage[]) => {
      queryClient.setQueryData<ChatMessage[]>(
        ['chat', conversationId, 'messages'],
        (current = []) => update(current)
      )
    },
    [queryClient, conversationId]
  )

  // Room lifecycle: join on open and rejoin after every (re)connect. The
  // backend has no `conversation:leave` yet, so the socket stays in the room
  // until it disconnects.
  useEffect(() => {
    if (!socket || !conversationId) return

    // The socket spans every company of the session: the join names the
    // conversation's company so the server can check it against the token.
    const join = () =>
      socket.emit(Events.join, {
        room: conversationId,
        ...(companyId ? { companyId } : {}),
      })

    if (socket.connected) join()
    socket.on('connect', join)

    return () => {
      socket.off('connect', join)
    }
  }, [socket, conversationId, companyId])

  useEffect(() => {
    if (!socket || !conversationId) return

    const handleBroadcast = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return
      updateThread((current) => upsertMessage(current, message))
    }

    const handleStatus = (patch: ConversationMessageStatusPatch) => {
      if (patch.conversationId !== conversationId) return
      updateThread((current) => applyStatusPatch(current, patch))
    }

    const handleAttachment = (patch: ConversationMessageAttachmentPatch) => {
      if (patch.conversationId !== conversationId) return
      updateThread((current) => applyAttachmentPatch(current, patch))
    }

    socket.on(Events.broadcast, handleBroadcast)
    socket.on(Events.messageStatus, handleStatus)
    socket.on(Events.messageAttachment, handleAttachment)

    return () => {
      socket.off(Events.broadcast, handleBroadcast)
      socket.off(Events.messageStatus, handleStatus)
      socket.off(Events.messageAttachment, handleAttachment)
    }
  }, [socket, conversationId, updateThread])

  // Local previews live as long as the conversation stays open.
  useEffect(() => {
    const entries = outbox.current
    return () => {
      for (const entry of entries.values()) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      }
      entries.clear()
    }
  }, [conversationId])

  const fail = useCallback(
    (clientMessageId: string, reason: string) => {
      updateThread((current) => markMessageFailed(current, { clientMessageId }))
      toast.error('No se pudo enviar el mensaje', { description: reason })
    },
    [updateThread]
  )

  /** Stages the file of an entry (once) and builds its send payload. */
  const prepare = useCallback(
    async (clientMessageId: string): Promise<SendConversationMessageInput | null> => {
      const entry = outbox.current.get(clientMessageId)
      if (!entry || !conversationId) return null
      if (entry.payload) return entry.payload

      const { draft } = entry
      let uploadId: string | null = null

      if (hasFile(draft)) {
        try {
          const staged = await uploadSlots.current.run(() =>
            api.commands.messages.upload(
              conversationId,
              {
                file: draft.file,
                kind: uploadKindOf(draft),
                durationMs: draft.durationMs,
              },
              {
                onProgress: (progress) =>
                  updateThread((current) =>
                    applyUploadProgress(current, clientMessageId, progress)
                  ),
              }
            )
          )
          uploadId = staged.uploadId
        } catch (error: unknown) {
          fail(clientMessageId, uploadErrorMessage(error))
          return null
        }
      }

      entry.payload = {
        room: conversationId,
        ...(companyId ? { companyId } : {}),
        clientMessageId,
        msg: toOutgoingMessage(draft, uploadId),
      }
      return entry.payload
    },
    [conversationId, companyId, updateThread, fail]
  )

  /** Emits a prepared send and fails the row unless the API queued it. */
  const emit = useCallback(
    async (payload: SendConversationMessageInput) => {
      if (!socket) return

      const answer: unknown = await socket
        .timeout(SEND_ACK_TIMEOUT_MS)
        .emitWithAck(Events.sendMessage, payload)
        .catch(() => null)
      const ack = SendMessageAckSchema.safeParse(answer)

      if (!ack.success) {
        fail(payload.clientMessageId, ACK_ERRORS.timeout)
      } else if (!ack.data.ok) {
        fail(payload.clientMessageId, ACK_ERRORS[ack.data.code])
      }
    },
    [socket, fail]
  )

  /** Uploads run in parallel; the emits wait their turn in the chain. */
  const deliver = useCallback(
    (clientMessageId: string) => {
      const ready = prepare(clientMessageId)
      sendChain.current = sendChain.current.then(async () => {
        const payload = await ready
        if (payload) await emit(payload)
      })
    },
    [prepare, emit]
  )

  const send = useCallback(
    (draft: OutgoingDraft) => {
      if (!socket || !conversationId) return

      const clientMessageId = crypto.randomUUID()
      const previewUrl = hasFile(draft)
        ? URL.createObjectURL(draft.file)
        : draft.type === 'sticker'
          ? draft.previewUrl
          : undefined

      outbox.current.set(clientMessageId, {
        draft,
        previewUrl: hasFile(draft) ? previewUrl : undefined,
      })

      updateThread((current) =>
        upsertMessage(current, {
          id: clientMessageId,
          conversationId,
          clientMessageId,
          timestamp: new Date(),
          status: 'pending',
          sender: { id: senderId, type: senderType },
          msg: optimisticView(draft),
          ...(previewUrl ? { local: { previewUrl, progress: 0 } } : {}),
        })
      )

      deliver(clientMessageId)
    },
    [socket, conversationId, updateThread, senderId, senderType, deliver]
  )

  const retry = useCallback(
    (message: ChatMessage) => {
      if (!socket || !conversationId) return

      const clientMessageId = message.clientMessageId
      if (!clientMessageId) return

      if (!outbox.current.has(clientMessageId)) {
        // Failed before a reload: only text can be rebuilt from the row.
        if (message.msg.type !== 'text') {
          toast.info('Vuelve a adjuntar el archivo para reenviarlo.')
          return
        }
        outbox.current.set(clientMessageId, {
          draft: { type: 'text', text: message.msg.text },
        })
      }

      updateThread((current) =>
        markMessagePending(current, { id: message.id, clientMessageId })
      )
      deliver(clientMessageId)
    },
    [socket, conversationId, updateThread, deliver]
  )

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    send,
    retry,
  }
}

/** A tiny counting semaphore: at most `size` tasks run at once. */
function createSlots(size: number) {
  let running = 0
  const waiting: Array<() => void> = []

  const release = () => {
    running -= 1
    waiting.shift()?.()
  }

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (running >= size) await new Promise<void>((resolve) => waiting.push(resolve))
      running += 1
      try {
        return await task()
      } finally {
        release()
      }
    },
  }
}
