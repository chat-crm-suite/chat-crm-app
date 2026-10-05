import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
        const chatIndex = oldChats.findIndex((c) => c.id === newMessage.conversationId)
        if (chatIndex !== -1) {
          const chats = [...oldChats]
          chats[chatIndex] = {
            ...chats[chatIndex],
            preview: {
              content: getMessageStrategy(newMessage.msg.type).getContent(
                newMessage.msg.content
              ),
              datetime: newMessage.timestamp,
            },
          }
          return chats
        }
        return oldChats
      })

      // Update chat messages
      queryClient.setQueryData(
        ['chat', newMessage.conversationId, 'messages'],
        (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return [newMessage]
          return [...oldMessages, newMessage]
        }
      )
    }

    socket.on(Events.broadcast, handleNewMessage)

    // Asignación automática: refrescar listas al recibir eventos del backend.
    const handleAssigned = () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
    }
    const handleUnassigned = () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'needsResponse'] })
    }

    socket.on(Events.assigned, handleAssigned)
    socket.on(Events.unassigned, handleUnassigned)

    socket.on('notification', (data) => {
      toast.info(data.message)
    })

    return () => {
      socket.off(Events.broadcast, handleNewMessage)
      socket.off(Events.assigned, handleAssigned)
      socket.off(Events.unassigned, handleUnassigned)
      socket.off('notification')
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
