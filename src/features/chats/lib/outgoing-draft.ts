import type {
  AttachmentType,
  MediaRef,
  MessageView,
  OutgoingMessage,
} from '@chat-crm/contracts'

/** Facts the composer knows about a file before uploading it. */
interface FileFacts {
  file: File
  width?: number | null
  height?: number | null
  durationMs?: number | null
}

/**
 * What the agent asked to send, before any upload. Media keeps the `File`
 * so a retry can upload it again; a re-sent sticker points at the stored one.
 */
export type OutgoingDraft =
  | { type: 'text'; text: string }
  | ({ type: 'image' | 'video'; caption?: string } & FileFacts)
  | ({ type: 'audio'; voice: boolean } & FileFacts)
  | ({ type: 'document'; caption?: string } & FileFacts)
  | ({ type: 'sticker' } & FileFacts)
  | { type: 'sticker'; attachmentId: string; previewUrl: string }

export type MediaDraft = Exclude<OutgoingDraft, { type: 'text' }>

/** The draft carries a local file to upload (all media but re-sent stickers). */
export function hasFile(
  draft: OutgoingDraft
): draft is Extract<OutgoingDraft, { file: File }> {
  return 'file' in draft
}

/** Upload kind of a media draft (the API validates per kind). */
export function uploadKindOf(draft: MediaDraft): AttachmentType {
  return draft.type
}

/**
 * The row shown while the draft is on its way: the same view the API will
 * broadcast, with a pending file the thread renders from its local preview.
 */
export function optimisticView(draft: OutgoingDraft): MessageView {
  if (draft.type === 'text') return { type: 'text', text: draft.text }

  const media: MediaRef = hasFile(draft)
    ? {
        attachmentId: null,
        url: null,
        status: 'pending',
        mimeType: draft.file.type || null,
        sizeBytes: draft.file.size,
        durationMs: draft.durationMs ?? null,
        width: draft.width ?? null,
        height: draft.height ?? null,
      }
    : {
        attachmentId: draft.attachmentId,
        url: null,
        status: 'pending',
        mimeType: 'image/webp',
        sizeBytes: null,
        durationMs: null,
        width: 512,
        height: 512,
      }

  switch (draft.type) {
    case 'image':
    case 'video':
      return { type: draft.type, media, caption: draft.caption ?? null }
    case 'audio':
      return { type: 'audio', media, voice: draft.voice }
    case 'document':
      return {
        type: 'document',
        media,
        filename: draft.file.name,
        caption: draft.caption ?? null,
      }
    case 'sticker':
      return { type: 'sticker', media }
  }
}

/**
 * The send payload's `msg` once the file is staged (`uploadId`). Empty
 * captions are dropped: the contract rejects blank text.
 */
export function toOutgoingMessage(
  draft: OutgoingDraft,
  uploadId: string | null
): OutgoingMessage {
  const caption = (value?: string) => value?.trim() || undefined
  const staged = () => {
    if (!uploadId) throw new Error(`A ${draft.type} needs its upload first`)
    return uploadId
  }

  switch (draft.type) {
    case 'text':
      return { type: 'text', text: draft.text }
    case 'image':
    case 'video':
      return { type: draft.type, uploadId: staged(), caption: caption(draft.caption) }
    case 'audio':
      return { type: 'audio', uploadId: staged(), voice: draft.voice }
    case 'document':
      return {
        type: 'document',
        uploadId: staged(),
        filename: draft.file.name,
        caption: caption(draft.caption),
      }
    case 'sticker':
      return {
        type: 'sticker',
        source: hasFile(draft)
          ? { uploadId: staged() }
          : { attachmentId: draft.attachmentId },
      }
  }
}
