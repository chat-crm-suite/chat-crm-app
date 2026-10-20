/**
 * The conversation on screen right now (set by the inbox while a chat is
 * open). Module state on purpose: the notification listener lives in the
 * shell, outside the inbox's React context, and only needs to read it.
 */
let openConversationId: string | null = null

export function setOpenConversation(conversationId: string | null): void {
  openConversationId = conversationId
}

export function getOpenConversation(): string | null {
  return openConversationId
}
