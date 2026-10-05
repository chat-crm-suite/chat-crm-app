import { format } from 'date-fns'
import type { ChatMessage } from '../types/chat.domain'
import type { SenderType, SendMessageRequest } from '../types/message.api'

type GroupMessages = Record<string, ChatMessage[]>

export const messageBuilder = {
  group: {
    date: (messages: ChatMessage[]): GroupMessages =>
      groupMessagesByDate(messages),
  },
  chat(conversationId: string) {
    return new MessagePayloadBuilder().chat(conversationId)
  },
}

function groupMessagesByDate(
  messages: ChatMessage[]
): Record<string, ChatMessage[]> {
  const groups = messages.reduce(
    (acc, msg) => {
      const dateKey: string = format(new Date(msg.timestamp), 'yyyy-MM-dd')
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], msg] : [msg]
      return acc
    },
    {} as Record<string, ChatMessage[]>
  )

  for (const date in groups) {
    groups[date].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  const sortedGroups = Object.fromEntries(
    Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    )
  )

  return sortedGroups
}

class MessagePayloadBuilder {
  private payload: Partial<SendMessageRequest> = {}

  chat(conversationId: string) {
    this.payload.room = conversationId
    return this
  }

  sender(id: string, type: SenderType = 'member') {
    this.payload.sender = {
      id,
      type,
    }

    return this
  }

  to(phone: string) {
    this.payload.to = phone
    return this
  }

  text(body: string): SendMessageRequest {
    return {
      ...this.payload,
      msg: {
        type: 'text',
        content: {
          body,
        },
      },
    } as SendMessageRequest
  }
}
