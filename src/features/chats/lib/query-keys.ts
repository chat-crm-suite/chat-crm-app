import type { ChatListView } from '../types/chat.domain'

/**
 * Query keys of the inbox. Every list lives under `['chat', 'lists', …]` so a
 * lifecycle result or a socket event can patch or refresh all of them at once.
 */
export const chatKeys = {
  all: ['chat'] as const,
  lists: ['chat', 'lists'] as const,
  list: (view: ChatListView) => ['chat', 'lists', view] as const,
  case: (conversationId: string) => ['chat', conversationId, 'case'] as const,
  sentiment: (conversationId: string) =>
    ['chat', conversationId, 'sentiment'] as const,
  assignments: (conversationId: string) =>
    ['chat', conversationId, 'assignments'] as const,
  members: (q: string) => ['company-members', 'workload', q] as const,
  channels: ['channels'] as const,
}
