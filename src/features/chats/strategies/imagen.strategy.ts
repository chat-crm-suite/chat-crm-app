import type { ChatMessage } from '../types/chat.domain'
import type { WhatsAppMediaContent } from '../types/message.domain'
import type { MessageStrategy } from './message.strategy'

export class ImagenStrategy implements MessageStrategy {
  getRenderData(msg: ChatMessage['msg']): { text: string; url?: string } {
    return {
      text: (msg.content as WhatsAppMediaContent).caption ?? 'Imagen recibida',
      // Never stringify a missing url: `${null}` would request ".../null".
      url: msg.mediaUrl ?? undefined,
    }
  }
  getContent(content: WhatsAppMediaContent): string {
    return content?.caption ?? 'Imagen recibida'
  }
}
