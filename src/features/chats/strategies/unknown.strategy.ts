import type { ChatMessage } from '../types/chat.domain'
import type { MessageStrategy } from './message.strategy'

/**
 * Fallback for message types without a dedicated strategy yet
 * (audio, video, sticker, location, contact, template, interactive,
 * reaction). Renders a placeholder instead of crashing the chat.
 */
export class UnknownStrategy implements MessageStrategy {
  getRenderData(msg: ChatMessage['msg']): { text: string; url?: string } {
    return { text: `[Mensaje de tipo ${msg.type} no soportado]` }
  }

  getContent(): string {
    return 'Mensaje no soportado'
  }
}
