import type { ChatMessage } from '../types/chat.domain'
import {
  type MessageType,
  type WhatsAppMessageContent,
} from '../types/message.domain'
import { DocumentStrategy } from './document.strategy'
import { ImagenStrategy } from './imagen.strategy'
import { TextStrategy } from './text.strategy'
import { UnknownStrategy } from './unknown.strategy'

export interface MessageStrategy {
  getContent(content: WhatsAppMessageContent): string
  getRenderData(msg: ChatMessage['msg']): {
    text: string
    url?: string
  }
}

const SUPPORT_TYPE: Partial<Record<MessageType, MessageStrategy>> = {
  text: new TextStrategy(),
  document: new DocumentStrategy(),
  image: new ImagenStrategy(),
}

const fallbackStrategy = new UnknownStrategy()

export function getMessageStrategy(type: MessageType) {
  return SUPPORT_TYPE[type] ?? fallbackStrategy
}
