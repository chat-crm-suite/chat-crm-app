import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  consumeSelfInitiatedAssignment,
  resolveAssignmentToast,
} from '@/lib/socket-taxonomy'
import { useSocket } from '@/context/socket-provider'
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
import { ChatsProvider } from './contexts/chats.provider'
import { getMessageStrategy } from './strategies/message.strategy'
import type { Chat, ChatMessage } from './types/chat.domain'
import { ChatSocketEvents as Events } from './types/socket.api'

export function Chats() {
  const queryClient = useQueryClient()
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (newMessage: ChatMessage) => {
      queryClient.setQueryData(['chat', 'list'], (oldChats: Chat[] = []) => {
        // Change preview
        const chatIndex = oldChats.findIndex(
          (c) => c.id === newMessage.conversationId
        )
        if (chatIndex !== -1) {
          const chats = [...oldChats]
          chats[chatIndex] = {
            ...chats[chatIndex],
            preview: {
              content: getMessageStrategy(newMessage.msg.type).getContent(
                newMessage.msg.content
              ),
              datetime: newMessage.timestamp,
              // Same shape as the REST list: the type labels attachments
              // whose content is empty.
              type: newMessage.msg.type,
            },
          }
          return chats
        }
        return oldChats
      })
      // The open thread cache is owned by `useChatThread`.
    }

    socket.on(Events.broadcast, handleNewMessage)

    // Assignment: always refresh the lists; the toast is skipped when the
    // event echoes this client's own action (claim/self-assignment, already
    // announced by the mutation). `notification:new` is handled only in the
    // socket-provider.
    const handleAssigned = (payload: unknown) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })

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
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'needsResponse'],
      })

      const decision = resolveAssignmentToast('unassigned', payload)
      if (decision) {
        toast[decision.type](decision.title, {
          description: decision.description,
          id: decision.id,
        })
      }
    }

    socket.on(Events.assigned, handleAssigned)
    socket.on(Events.unassigned, handleUnassigned)

    return () => {
      socket.off(Events.broadcast, handleNewMessage)
      socket.off(Events.assigned, handleAssigned)
      socket.off(Events.unassigned, handleUnassigned)
    }
  }, [socket, queryClient])

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

      <Main fixed>
        <section className='flex h-full gap-6'>
          <ChatsProvider>
            <ChatList /> {/* Left Side */}
            <ChatBox /> {/* Right Side */}
            <ClientChatDialog />
          </ChatsProvider>
        </section>
      </Main>
    </>
  )
}
