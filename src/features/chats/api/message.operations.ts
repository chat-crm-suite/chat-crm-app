import {
  ConversationMessageSchema,
  StagedUploadSchema,
  type AttachmentType,
  type StagedUpload,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'
import type { ChatMessage } from '../types/chat.domain'

const conversations = client('/conversations')

export const getMessagesByConversationId = async (
  conversationId: string
): Promise<ChatMessage[]> => {
  const { data } = await conversations.get<unknown>(`/${conversationId}/messages`)

  // Dev-only runtime check: catches API/contract drift immediately.
  if (import.meta.env.DEV) return ConversationMessageSchema.array().parse(data)

  return (data ?? []) as ChatMessage[]
}

export interface UploadOptions {
  /** Upload progress in [0, 1]. */
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Stages a file to send in a conversation (`POST /conversations/:id/uploads`).
 * The API checks it against the channel and answers the `uploadId` a send
 * then references.
 */
export const uploadAttachment = async (
  conversationId: string,
  upload: { file: File; kind: AttachmentType; durationMs?: number | null },
  { onProgress, signal }: UploadOptions = {}
): Promise<StagedUpload> => {
  const form = new FormData()
  form.append('kind', upload.kind)
  if (upload.durationMs) form.append('durationMs', String(Math.round(upload.durationMs)))
  form.append('file', upload.file, upload.file.name)

  const { data } = await conversations.post<unknown>(`/${conversationId}/uploads`, form, {
    signal,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(event.loaded / event.total)
    },
  })

  if (import.meta.env.DEV) return StagedUploadSchema.parse(data)

  return data as StagedUpload
}
