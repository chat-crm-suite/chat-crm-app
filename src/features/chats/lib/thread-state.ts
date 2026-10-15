import type {
  ConversationMessageAttachmentPatch,
  ConversationMessageStatusPatch,
  MessageStatus,
} from '@chat-crm/contracts'
import type { ChatMessage } from '../types/chat.domain'

/** Statuses only move forward (`failed` is terminal); order matches the API. */
const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/** Identifies a row by its server id first, then by the optimistic client id. */
interface MessageRef {
  id?: string
  clientMessageId?: string | null
}

export function sortChronologically(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

function matchesRef(message: ChatMessage, ref: MessageRef): boolean {
  if (ref.id && message.id === ref.id) return true

  return (
    !!ref.clientMessageId && message.clientMessageId === ref.clientMessageId
  )
}

function advanceStatus(
  current: MessageStatus,
  incoming: MessageStatus
): MessageStatus {
  if (current === incoming) return current
  if (current === 'failed' || incoming === 'failed') return 'failed'

  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current
}

/** Media of a row whose file the API can already serve. */
function hasServerMedia(message: ChatMessage): boolean {
  return 'media' in message.msg && message.msg.media.status === 'ready'
}

/**
 * Adds a message to the thread (or merges it with its existing row). Dedupe is
 * by `id` first and then by `clientMessageId`, so the optimistic pending row
 * and its saved broadcast collapse into one without flicker: the local file
 * preview stays until the API serves the file itself.
 */
export function upsertMessage(
  messages: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  const index = messages.findIndex((message) => matchesRef(message, incoming))

  if (index === -1) return sortChronologically([...messages, incoming])

  const current = messages[index]
  const local =
    incoming.local ?? (hasServerMedia(incoming) ? undefined : current.local)
  const merged: ChatMessage = {
    ...incoming,
    status: advanceStatus(current.status, incoming.status),
  }
  if (local) merged.local = local

  const updated = [...messages]
  updated[index] = merged

  return sortChronologically(updated)
}


/**
 * Applies one `conversation:message:status` patch (delivery tick). The row is
 * matched by server `id`, falling back to `clientMessageId` when the broadcast
 * has not landed yet; unknown rows and regressions are ignored.
 */
export function applyStatusPatch(
  messages: ChatMessage[],
  patch: ConversationMessageStatusPatch
): ChatMessage[] {
  const index = messages.findIndex((message) => matchesRef(message, patch))
  if (index === -1) return messages

  const current = messages[index]
  const status = advanceStatus(current.status, patch.status)
  if (status === current.status) return messages

  const next = [...messages]
  next[index] = { ...current, status }

  return next
}

/**
 * Explicit user retry: the row goes back to `pending` so the incoming
 * `sent`/`delivered`/`read` patches can advance it again (a `failed` row is
 * terminal for every server patch otherwise).
 */
export function markMessagePending(
  messages: ChatMessage[],
  ref: MessageRef
): ChatMessage[] {
  const index = messages.findIndex((message) => matchesRef(message, ref))
  if (index === -1) return messages

  const next = [...messages]
  next[index] = { ...next[index], status: 'pending' }

  return next
}

/**
 * Applies one `conversation:message:attachment` patch: `ready` carries the
 * stored url (the row publishes its media), `failed` keeps the row with an
 * honest unavailable state. Matched by message id (the patch carries it).
 */
export function applyAttachmentPatch(
  messages: ChatMessage[],
  patch: ConversationMessageAttachmentPatch
): ChatMessage[] {
  const index = messages.findIndex((message) => message.id === patch.id)
  if (index === -1) return messages

  const current = messages[index]
  if (!('media' in current.msg)) return messages

  const { media } = current.msg
  const updated = [...messages]
  updated[index] = {
    ...current,
    msg: {
      ...current.msg,
      media: {
        ...media,
        attachmentId: patch.attachmentId,
        url: patch.url ?? media.url,
        status: patch.status,
        mimeType: patch.mimeType ?? media.mimeType,
        sizeBytes: patch.sizeBytes ?? media.sizeBytes,
      },
    },
  }

  return updated
}

/** Upload progress of an optimistic row, in [0, 1]. */
export function applyUploadProgress(
  messages: ChatMessage[],
  clientMessageId: string,
  progress: number
): ChatMessage[] {
  const index = messages.findIndex(
    (message) => message.clientMessageId === clientMessageId
  )
  if (index === -1) return messages

  const updated = [...messages]
  updated[index] = {
    ...messages[index],
    local: { ...messages[index].local, progress },
  }

  return updated
}

/**
 * A send that never reached the API (refused acknowledgement, timeout, failed
 * upload) fails locally: no server patch will ever arrive for it.
 */
export function markMessageFailed(
  messages: ChatMessage[],
  ref: MessageRef
): ChatMessage[] {
  const index = messages.findIndex((message) => matchesRef(message, ref))
  if (index === -1) return messages

  const current = messages[index]
  const updated = [...messages]
  updated[index] = {
    ...current,
    status: 'failed',
    local: current.local && { ...current.local, progress: undefined },
  }

  return updated
}
