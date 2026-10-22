import type { QueryClient } from '@tanstack/react-query'
import type {
  ConversationLifecycleResult,
  ConversationStatusChanged,
} from '@chat-crm/contracts'
import type { Chat } from '../types/chat.domain'
import { chatKeys } from './query-keys'

export type ChatPatch = Partial<Chat> | ((chat: Chat) => Chat)

export function applyChatPatch(chat: Chat, patch: ChatPatch): Chat {
  return typeof patch === 'function' ? patch(chat) : { ...chat, ...patch }
}

/** Patches one conversation in every cached list tab at once. */
export function patchChatLists(
  queryClient: QueryClient,
  conversationId: string,
  patch: ChatPatch
) {
  queryClient.setQueriesData<Chat[]>({ queryKey: chatKeys.lists }, (old) =>
    old?.map((chat) =>
      chat.id === conversationId ? applyChatPatch(chat, patch) : chat
    )
  )
}

/** Applies a patch to every cached conversation (it decides what changes). */
export function patchAllChats(queryClient: QueryClient, patch: ChatPatch) {
  queryClient.setQueriesData<Chat[]>({ queryKey: chatKeys.lists }, (old) =>
    old?.map((chat) => applyChatPatch(chat, patch))
  )
}

/** Fresh copy of a conversation from whichever list holds it. */
export function findCachedChat(
  queryClient: QueryClient,
  predicate: (chat: Chat) => boolean
): Chat | undefined {
  for (const [, list] of queryClient.getQueriesData<Chat[]>({
    queryKey: chatKeys.lists,
  })) {
    const found = list?.find(predicate)
    if (found) return found
  }
  return undefined
}

/**
 * What a lifecycle answer changes on the row. The derived transfer marker is
 * the server's to compute: a new owner clears the old one until the refetch.
 */
export function lifecyclePatch(result: ConversationLifecycleResult): ChatPatch {
  return (chat) => ({
    ...chat,
    status: result.status,
    assignee: result.assignee,
    transfer:
      result.assignee?.memberId === chat.assignee?.memberId
        ? chat.transfer
        : null,
  })
}

/** `conversation:status:changed`: only the status moves. */
export function statusChangePatch(event: ConversationStatusChanged): ChatPatch {
  return { status: event.status }
}

/**
 * After a write the membership of the tabs may change (resolved leaves Mis
 * chats, released enters the queue): patch first for an instant UI, then let
 * every list and the work queue refetch in the background.
 */
export function refreshAfterLifecycle(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: chatKeys.lists })
  void queryClient.invalidateQueries({ queryKey: ['work-queue'] })
  void queryClient.invalidateQueries({ queryKey: ['analytics'] })
}

/**
 * A live message on a listed conversation: new preview, the row moves to the
 * top, and an inbound message reopens a pending/resolved chat (the API does
 * the same) and counts as unread unless the chat is open.
 */
export function applyIncomingMessage(
  list: Chat[] | undefined,
  message: {
    conversationId: string
    inbound: boolean
    preview: NonNullable<Chat['preview']>
  },
  openConversationId: string | null
): Chat[] | undefined {
  if (!list) return list
  const index = list.findIndex((chat) => chat.id === message.conversationId)
  if (index === -1) return list

  const current = list[index]
  const updated: Chat = {
    ...current,
    preview: message.preview,
    ...(message.inbound
      ? {
          status: current.status === 'archived' ? current.status : 'open',
          lastInboundAt: message.preview.datetime ?? current.lastInboundAt,
          unread: current.id === openConversationId ? 0 : current.unread + 1,
        }
      : {}),
  }

  return [updated, ...list.slice(0, index), ...list.slice(index + 1)]
}
