import type { MediaRef } from '@chat-crm/contracts'
import { resolveMediaUrl } from '@/lib/media-url'
import type { ChatMessage } from '../types/chat.domain'

export type MediaSource =
  /** The file can be shown: local preview while sending, then the API's. */
  | { state: 'ready'; src: string; uploading: boolean; progress: number | null }
  /** The API is still fetching the customer's file from the provider. */
  | { state: 'loading' }
  /** The file will never be available (provider expired it, upload lost). */
  | { state: 'unavailable' }

/**
 * Where a media message's file comes from right now. A row this client is
 * sending shows its own `blob:` preview (with upload progress) until the API
 * serves the stored file, so the bubble never flickers to a spinner.
 */
export function mediaSource(message: ChatMessage, media: MediaRef): MediaSource {
  const previewUrl = message.local?.previewUrl
  const serverUrl = media.status === 'ready' ? resolveMediaUrl(media.url) : undefined
  const progress = message.local?.progress

  if (serverUrl) {
    return { state: 'ready', src: serverUrl, uploading: false, progress: null }
  }
  if (previewUrl) {
    return {
      state: 'ready',
      src: previewUrl,
      uploading: message.status === 'pending',
      progress: progress ?? null,
    }
  }
  if (media.status === 'pending') return { state: 'loading' }

  return { state: 'unavailable' }
}

/** Display box of a picture: known dimensions reserve space (no jumps). */
export function mediaFrameStyle(
  width: number | null,
  height: number | null
): { aspectRatio: string } | undefined {
  return width && height ? { aspectRatio: `${width} / ${height}` } : undefined
}
