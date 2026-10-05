import type { ChatMessage } from '../types/chat.domain'
import type { WhatsAppDocumentContent } from '../types/message.domain'
import type { MessageStrategy } from './message.strategy'

export class DocumentStrategy implements MessageStrategy {
  getRenderData(msg: ChatMessage['msg']): { text: string; url?: string } {
    return {
      text:
        (msg.content as WhatsAppDocumentContent).filename ??
        'Documento recivido',
      url: msg.mediaUrl ?? undefined,
    }
  }
  getContent(content: WhatsAppDocumentContent): string {
    return content.filename ?? 'Document recibido'
  }
}
