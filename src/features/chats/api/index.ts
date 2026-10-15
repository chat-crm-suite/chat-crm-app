import { searchClient } from './client.operations'
import {
  getMessagesByConversationId,
  uploadAttachment,
} from './message.operations'

export const api = {
  queries: {
    clients: {
      search: searchClient,
    },
    messages: {
      get: (conversationId: string) =>
        getMessagesByConversationId(conversationId),
    },
  },
  commands: {
    messages: {
      upload: uploadAttachment,
    },
  },
}
