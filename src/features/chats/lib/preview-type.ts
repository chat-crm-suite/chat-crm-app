import type { MessageType } from '@chat-crm/contracts'

/**
 * Media kind of the last message for the list preview. The list payload
 * carries `preview.type`; older payloads may omit it, so the kind is then
 * inferred from the preview copy the strategies write (labels such as
 * `Imagen recibida` and bare filenames). An explicit type always wins.
 */

const PREFIX_TYPES: [RegExp, MessageType][] = [
  [/^imagen\b/i, 'image'],
  [/^documento?\b/i, 'document'],
  [/^audio\b/i, 'audio'],
  [/^video\b/i, 'video'],
]

const EXTENSION_TYPES: [RegExp, MessageType][] = [
  [/\.(jpe?g|png|webp|gif|heic|bmp|svg)$/i, 'image'],
  [/\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv|odt|ods)$/i, 'document'],
  [/\.(mp3|ogg|wav|m4a|aac|opus)$/i, 'audio'],
  [/\.(mp4|mov|avi|mkv|webm|3gp)$/i, 'video'],
]

export function inferPreviewType(
  content: string | null | undefined,
  explicit?: MessageType | null
): MessageType | null {
  // Live payloads are authoritative: `text` means "no media to label".
  if (explicit) return explicit === 'text' ? null : explicit

  const text = content?.trim()
  if (!text) return null

  const prefix = PREFIX_TYPES.find(([pattern]) => pattern.test(text))
  if (prefix) return prefix[1]

  const extension = EXTENSION_TYPES.find(([pattern]) => pattern.test(text))
  if (extension) return extension[1]

  return null
}
