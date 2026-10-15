import { describe, expect, it } from 'vitest'
import { API_URL } from '@/lib/http'
import { messageWith, readyMedia } from '../testing/messages'
import { recentStickers } from './recent-stickers'

const sticker = (attachmentId: string, status: 'ready' | 'pending' = 'ready') =>
  messageWith({
    type: 'sticker',
    media: readyMedia({ attachmentId, url: `/attachments/${attachmentId}`, status }),
  })

describe('recentStickers', () => {
  it('lists stored stickers newest first, each file once', () => {
    expect(
      recentStickers([sticker('a'), sticker('b'), sticker('a'), sticker('c', 'pending')])
    ).toEqual([
      { attachmentId: 'a', url: `${API_URL}/attachments/a` },
      { attachmentId: 'b', url: `${API_URL}/attachments/b` },
    ])
  })
})
