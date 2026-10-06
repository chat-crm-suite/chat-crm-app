import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ConversationMessageAttachmentPatch,
  ConversationMessageStatusPatch,
  MessageSenderType,
  SendConversationMessageInput,
} from '@chat-crm/contracts'
import { useSocket } from '@/context/socket-provider'
import { api } from '../api'
import { messageBuilder } from '../builders/message.builder'
import {
  applyAttachmentPatch,
  applyStatusPatch,
  markMessagePending,
  sortChronologically,
  upsertMessage,
} from '../lib/thread-state'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents as Events } from '../types/socket.api'

/** Send context of the open conversation (member, company and customer). */
export interface ChatThreadIdentity {
  companyId?: string | null
  sender: { id: string; type: MessageSenderType }
  to: string
}

/**
 * Owns the message cache of the open conversation: REST history, optimistic
 * send, live reconciliation and room membership. The list preview stays in
 * `Chats` (it listens to the broadcast for every conversation).
 */
export function useChatThread(
  conversationId: string | undefined,
  identity: ChatThreadIdentity
) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { companyId, sender, to } = identity
  const senderId = sender.id
  const senderType = sender.type

  // Original send payloads by clientMessageId: a retry re-emits the exact same
  // payload, so the API dedupes by `client_message_id` instead of inserting.
  const outbox = useRef(new Map<string, SendConversationMessageInput>())

  const query = useQuery({
    queryKey: ['chat', conversationId, 'messages'],
    queryFn: () => api.queries.messages.get(conversationId as string),
    enabled: !!conversationId,
    select: sortChronologically,
  })

  // Room lifecycle: join on open and rejoin after every (re)connect. The
  // backend has no `conversation:leave` yet, so the socket stays in the room
  // until it disconnects.
  useEffect(() => {
    if (!socket || !conversationId) return

    const join = () => socket.emit(Events.join, { room: conversationId })

    if (socket.connected) join()
    socket.on('connect', join)

    return () => {
      socket.off('connect', join)
      // TODO(backend): emit `conversation:leave` here once the API exposes it.
    }
  }, [socket, conversationId])

  useEffect(() => {
    if (!socket || !conversationId) return
    const key = ['chat', conversationId, 'messages'] as const

    const handleBroadcast = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return

      queryClient.setQueryData<ChatMessage[]>(key, (current = []) =>
        upsertMessage(current, message)
      )
    }

    const handleStatus = (patch: ConversationMessageStatusPatch) => {
      if (patch.conversationId !== conversationId) return

      queryClient.setQueryData<ChatMessage[]>(key, (current = []) =>
        applyStatusPatch(current, patch)
      )
    }

    const handleAttachment = (patch: ConversationMessageAttachmentPatch) => {
      if (patch.conversationId !== conversationId) return

      queryClient.setQueryData<ChatMessage[]>(key, (current = []) =>
        applyAttachmentPatch(current, patch)
      )
    }

    socket.on(Events.broadcast, handleBroadcast)
    socket.on(Events.messageStatus, handleStatus)
    socket.on(Events.messageAttachment, handleAttachment)

    return () => {
      socket.off(Events.broadcast, handleBroadcast)
      socket.off(Events.messageStatus, handleStatus)
      socket.off(Events.messageAttachment, handleAttachment)
    }
  }, [socket, conversationId, queryClient])

  const send = useCallback(
    (body: string) => {
      if (!socket || !conversationId) return

      const clientMessageId = crypto.randomUUID()
      const payload = messageBuilder
        .chat(conversationId)
        .companyId(companyId)
        .clientMessageId(clientMessageId)
        .sender(senderId, senderType)
        .to(to)
        .text(body)

      outbox.current.set(clientMessageId, payload)

      queryClient.setQueryData<ChatMessage[]>(
        ['chat', conversationId, 'messages'],
        (current = []) =>
          upsertMessage(current, {
            id: clientMessageId,
            conversationId,
            clientMessageId,
            timestamp: new Date(),
            status: 'pending',
            sender: { id: senderId, type: senderType },
            msg: { type: 'text', mediaUrl: null, content: { body } },
          })
      )

      socket.emit(Events.sendMessage, payload)
    },
    [socket, conversationId, queryClient, companyId, to, senderId, senderType]
  )

  const retry = useCallback(
    (message: ChatMessage) => {
      if (!socket || !conversationId) return

      const clientMessageId = message.clientMessageId
      if (!clientMessageId) return

      const payload =
        outbox.current.get(clientMessageId) ??
        rebuildTextPayload(message, { companyId, to })

      if (!payload) return

      queryClient.setQueryData<ChatMessage[]>(
        ['chat', conversationId, 'messages'],
        (current = []) =>
          markMessagePending(current, { id: message.id, clientMessageId })
      )

      socket.emit(Events.sendMessage, payload)
    },
    [socket, conversationId, queryClient, companyId, to]
  )

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    send,
    retry,
  }
}

/**
 * History rows (failed before a reload) have no stored payload: rebuild the
 * text send from the message itself, keeping its `clientMessageId` so the API
 * still treats the retry as the same send.
 */
function rebuildTextPayload(
  message: ChatMessage,
  { companyId, to }: { companyId?: string | null; to: string }
): SendConversationMessageInput | null {
  if (message.msg.type !== 'text' || !message.clientMessageId) return null

  const body =
    'body' in message.msg.content ? message.msg.content.body : undefined
  if (!body) return null

  return messageBuilder
    .chat(message.conversationId)
    .companyId(companyId)
    .clientMessageId(message.clientMessageId)
    .sender(message.sender.id, message.sender.type)
    .to(to)
    .text(body)
}
