import type { AttachmentType, ChannelCapabilities } from '@chat-crm/contracts'
import { formatFileSize } from './attachment-meta'

/** Kinds an agent attaches from the composer (stickers have their picker). */
export type AttachableKind = Exclude<AttachmentType, 'sticker'>

/** What the composer offers in its attach menu. */
export type AttachIntent = 'media' | 'document'

const KIND_LABELS: Record<AttachableKind, string> = {
  image: 'La foto',
  video: 'El video',
  audio: 'El audio',
  document: 'El documento',
}

export type Classification =
  | { ok: true; kind: AttachableKind }
  | { ok: false; reason: string }

const normalized = (mime: string) => mime.split(';')[0].trim().toLowerCase()

/**
 * Decides how a file goes out on the conversation's channel, before any
 * upload, so the agent learns at once why a file cannot be sent. Photos and
 * videos ride as media; anything else the channel accepts as a document or
 * an audio file. The API checks again from the content.
 */
export function classifyFile(
  file: File,
  capabilities: ChannelCapabilities | null,
  intent?: AttachIntent
): Classification {
  if (!capabilities) {
    return { ok: false, reason: 'Este canal todavía no permite enviar archivos.' }
  }

  const mime = normalized(file.type)
  const accepts = (kind: AttachableKind) =>
    capabilities.media[kind]?.mimeTypes.includes(mime) ?? false
  const order: AttachableKind[] =
    intent === 'document'
      ? ['document']
      : intent === 'media'
        ? ['image', 'video']
        : ['image', 'video', 'audio', 'document']

  const kind = order.find(accepts)
  if (!kind) {
    return {
      ok: false,
      reason:
        intent === 'media'
          ? `«${file.name}» no es una foto o video compatible (JPG, PNG, MP4).`
          : `«${file.name}»: este tipo de archivo no se puede enviar por este canal.`,
    }
  }

  const maxBytes = capabilities.media[kind]?.maxBytes ?? Infinity
  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `${KIND_LABELS[kind]} «${file.name}» supera ${formatFileSize(maxBytes)}.`,
    }
  }

  return { ok: true, kind }
}

/** `accept` attribute for a file input of the attach menu. */
export function acceptFor(
  capabilities: ChannelCapabilities | null,
  intent: AttachIntent
): string {
  const kinds: AttachableKind[] = intent === 'media' ? ['image', 'video'] : ['document']
  return kinds
    .flatMap((kind) => capabilities?.media[kind]?.mimeTypes ?? [])
    .join(',')
}

/** Natural size of a picture, so its bubble reserves the right frame. */
export async function readImageSize(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') {
    return null
  }
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}
