import { resolveMediaUrl } from '@/lib/media-url'
import type { ChatMessage } from '../types/chat.domain'

/** A sticker the conversation already holds, re-sendable by reference. */
export interface RecentSticker {
  attachmentId: string
  url: string
}

/** Most stickers the picker lists. */
export const MAX_RECENT_STICKERS = 24

/**
 * Stickers of a thread the agent can re-send by reference: stored ones only,
 * newest first, each file once.
 */
export function recentStickers(messages: ChatMessage[]): RecentSticker[] {
  const seen = new Set<string>()
  const recent: RecentSticker[] = []

  for (let index = messages.length - 1; index >= 0; index--) {
    const { msg } = messages[index]
    if (msg.type !== 'sticker' || msg.media.status !== 'ready') continue

    const { attachmentId } = msg.media
    const url = resolveMediaUrl(msg.media.url)
    if (!attachmentId || !url || seen.has(attachmentId)) continue

    seen.add(attachmentId)
    recent.push({ attachmentId, url })
    if (recent.length === MAX_RECENT_STICKERS) break
  }

  return recent
}
