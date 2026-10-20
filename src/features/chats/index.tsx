import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChannelSocketEvent,
  ChannelStatusChangedSchema,
  ConversationStatusChangedSchema,
  IaStatusSchema,
  AnalyticsSocketEvent,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  consumeSelfInitiatedAssignment,
  resolveAssignmentToast,
} from '@/lib/socket-taxonomy'
import { useSocket } from '@/context/socket-provider'
import { IA_STATUS_KEY } from '@/features/analytics/hooks/use-ia-status'
import {
  ChatBox,
  ChatList,
  ClientChatDialog,
  ConfigDrawer,
  Header,
  Main,
  NotificationBell,
  ProfileDropdown,
  ThemeSwitch,
} from './components'
import { Search } from './components/icons'
import { OpenConversationFromSearch } from './components/open-conversation-from-search'
import { useChats } from './contexts/chats.context'
import { ChatsProvider } from './contexts/chats.provider'
import { channelStatusPatch } from './lib/channel-health'
import {
  applyIncomingMessage,
  patchAllChats,
  statusChangePatch,
} from './lib/chat-cache'
import { chatKeys } from './lib/query-keys'
import { messageTypeOf, previewOf } from './messages/registry'
import type { Chat, ChatMessage } from './types/chat.domain'
import { ChatSocketEvents as Events } from './types/socket.api'

/**
 * Live updates of the inbox caches. Lives inside the provider so a status
 * change also patches the open conversation, not only the lists.
 */
function ChatsRealtime() {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { chatSelected, updateChat } = useChats()
  // Read inside handlers without re-subscribing on every selection.
  const openId = useRef<string | null>(null)
  openId.current = chatSelected?.id ?? null

  useEffect(() => {
    if (!socket) return

    const refreshLists = () =>
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists })

    const handleNewMessage = (message: ChatMessage) => {
      const inbound = message.sender?.type === 'customer'
      queryClient.setQueriesData<Chat[]>({ queryKey: chatKeys.lists }, (old) =>
        applyIncomingMessage(
          old,
          {
            conversationId: message.conversationId,
            inbound,
            preview: {
              content: previewOf(message.msg),
              datetime: message.timestamp ? new Date(message.timestamp) : null,
              // Same shape as the REST list: the type labels attachments
              // whose content is empty.
              type: messageTypeOf(message.msg),
            },
          },
          openId.current
        )
      )
      // An inbound message reopens a pending/resolved chat on the server too.
      if (inbound && openId.current === message.conversationId) {
        updateChat(message.conversationId, (chat) =>
          chat.status === 'pending' || chat.status === 'closed'
            ? { ...chat, status: 'open' }
            : chat
        )
      }
      // The open thread cache is owned by `useChatThread`.
    }

    // Assignment: always refresh the lists; the toast is skipped when the
    // event echoes this client's own action (claim/self-assignment, already
    // announced by the mutation). `notification:new` is handled only in the
    // socket-provider.
    const handleAssigned = (payload: unknown) => {
      refreshLists()
      const decision = resolveAssignmentToast('assigned', payload, {
        isSelfInitiated: consumeSelfInitiatedAssignment,
      })
      if (decision) {
        toast[decision.type](decision.title, {
          description: decision.description,
          id: decision.id,
        })
      }
    }
    const handleUnassigned = (payload: unknown) => {
      refreshLists()
      const decision = resolveAssignmentToast('unassigned', payload)
      if (decision) {
        toast[decision.type](decision.title, {
          description: decision.description,
          id: decision.id,
        })
      }
    }

    const handleStatusChanged = (payload: unknown) => {
      const parsed = ConversationStatusChangedSchema.safeParse(payload)
      if (!parsed.success) return refreshLists()
      updateChat(parsed.data.conversationId, statusChangePatch(parsed.data))
      void queryClient.invalidateQueries({
        queryKey: chatKeys.case(parsed.data.conversationId),
      })
      // Tab membership may change (resolved leaves Mis chats).
      refreshLists()
    }

    // A channel went down or came back: every conversation on it (and the
    // open one) locks or unlocks its composer at once.
    const handleChannelStatus = (payload: unknown) => {
      const parsed = ChannelStatusChangedSchema.safeParse(payload)
      if (!parsed.success) return refreshLists()
      const patch = channelStatusPatch(parsed.data)
      patchAllChats(queryClient, patch)
      if (openId.current) updateChat(openId.current, patch)
      void queryClient.invalidateQueries({ queryKey: chatKeys.channels })
    }

    // A conversation started from the CRM (maybe by someone else for me):
    // the refetch places it in the right tabs.
    const handleCreated = () => refreshLists()

    const handleIaStatus = (payload: unknown) => {
      const parsed = IaStatusSchema.safeParse(payload)
      if (parsed.success) queryClient.setQueryData(IA_STATUS_KEY, parsed.data)
      else void queryClient.invalidateQueries({ queryKey: IA_STATUS_KEY })
    }

    socket.on(Events.broadcast, handleNewMessage)
    socket.on(Events.assigned, handleAssigned)
    socket.on(Events.unassigned, handleUnassigned)
    socket.on(Events.statusChanged, handleStatusChanged)
    socket.on(Events.created, handleCreated)
    socket.on(ChannelSocketEvent.StatusChanged, handleChannelStatus)
    socket.on(AnalyticsSocketEvent.IaStatusChanged, handleIaStatus)

    return () => {
      socket.off(Events.broadcast, handleNewMessage)
      socket.off(Events.assigned, handleAssigned)
      socket.off(Events.unassigned, handleUnassigned)
      socket.off(Events.statusChanged, handleStatusChanged)
      socket.off(Events.created, handleCreated)
      socket.off(ChannelSocketEvent.StatusChanged, handleChannelStatus)
      socket.off(AnalyticsSocketEvent.IaStatusChanged, handleIaStatus)
    }
  }, [socket, queryClient, updateChat])

  return null
}

export function Chats() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <NotificationBell />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed className='max-sm:px-0 max-sm:pb-0'>
        <ChatsProvider>
          {/* One surface for list + conversation + rail: borders divide the
              panes, the background never changes between them. */}
          <section className='bg-card flex h-full min-h-0 overflow-hidden border-y sm:divide-x sm:rounded-lg sm:border'>
            <ChatList />
            <ChatBox />
          </section>
          <ChatsRealtime />
          <ClientChatDialog />
          <OpenConversationFromSearch />
        </ChatsProvider>
      </Main>
    </>
  )
}
