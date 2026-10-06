import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessagesSquare, MoreVertical } from 'lucide-react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { useSocket } from '@/context/socket-provider'
import { claimChat } from '@/services/chat.service'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { api } from '../api'
import { messageBuilder } from '../builders/message.builder'
import { useChats } from '../contexts/chats.provider'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents } from '../types/socket.api'
import { AssignedUser } from './assigned-user'
import { Composer } from './conversation/composer'
import { initials } from './conversation/identity'
import { ConversationThread } from './conversation/thread'
import { ToneControl } from './conversation/tone-control'

export const ChatBox = () => {
  const { auth } = useAuthStore()
  const { socket, isConnected } = useSocket()
  const {
    sentimentData,
    chatSelected: chat,
    setChatSelected,
    mobile,
    setMobile,
    setSearchClientDialog,
  } = useChats()

  const membership = auth.user?.memberships?.find(
    (m) => m.companyId === auth.company.id
  )
  const memberId = membership?.id ?? auth.user?.id
  const memberName =
    [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ') ||
    auth.user?.username

  const handleSendMessage = (body: string) => {
    if (!chat) return

    const payload = messageBuilder
      .chat(chat.id)
      .sender(memberId ?? '', 'member')
      .to(chat.customer.phone ?? '')
      .text(body)

    socket?.emit(ChatSocketEvents.sendMessage, payload)
  }

  // T3 replaces this with the idempotent optimistic retry; today a failed
  // message is simply re-sent through the v1 path.
  const handleRetry = (message: ChatMessage) => {
    if (message.msg.type !== 'text') return
    const body =
      'body' in message.msg.content ? message.msg.content.body : undefined
    if (body) handleSendMessage(body)
  }

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat', chat?.id, 'messages'],
    queryFn: () => api.queries.messages.get(chat!.id),
    enabled: !!chat?.id,
  })

  const queryClient = useQueryClient()
  const claim = useMutation({
    mutationFn: () => claimChat(chat!.id),
    onSuccess: () => {
      toast.success('Chat asignado a tu nombre')
      void queryClient.invalidateQueries({ queryKey: ['chat', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
      if (chat) setChatSelected({ ...chat, isUnassigned: false })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo tomar el chat'))
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
    },
  })

  const customerName = chat?.customer?.displayName ?? 'Cliente'

  return chat ? (
    <div
      className={cn(
        'bg-background absolute inset-0 start-full z-50 hidden w-full',
        'flex-1 flex-col border shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        mobile && 'start-0 flex'
      )}
    >
      {/* Top Part */}
      <header className='bg-card flex flex-none items-center justify-between gap-3 rounded-t-md border-b px-3 py-2.5 sm:px-4'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <Button
            size='icon'
            variant='ghost'
            className='-ms-2 size-8 sm:hidden'
            aria-label='Volver a la lista'
            onClick={() => {
              setChatSelected(null)
              setMobile(false)
            }}
          >
            <ArrowLeft className='rtl:rotate-180' />
          </Button>
          <Avatar className='size-8 lg:size-9'>
            <AvatarFallback className='text-xs font-semibold'>
              {initials(customerName)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold'>{customerName}</p>
            <p className='text-muted-foreground truncate text-xs'>
              {parsePhoneNumber(
                chat.customer?.phone ?? '',
                'PE'
              )?.formatInternational() || chat.customer?.phone}
            </p>
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          <ToneControl sentiment={sentimentData} />
          {chat.isUnassigned && (
            <Button
              size='sm'
              className='h-8 rounded-full px-3 text-xs'
              onClick={() => claim.mutate()}
              disabled={claim.isPending}
            >
              {claim.isPending ? 'Tomando…' : 'Tomar'}
            </Button>
          )}
          <AssignedUser conversationId={chat.id} />
          <Button
            size='icon'
            variant='ghost'
            className='size-8'
            aria-label='Más opciones'
          >
            <MoreVertical className='size-4' />
          </Button>
        </div>
      </header>

      <ConversationThread
        messages={messages ?? []}
        loading={isLoading}
        customerName={customerName}
        currentMemberId={memberId}
        currentMemberName={memberName}
        onRetry={handleRetry}
      />

      <Composer connected={isConnected} onSend={handleSendMessage} />
    </div>
  ) : (
    <div
      className={cn(
        'bg-card absolute inset-0 start-full z-50 hidden w-full',
        'flex-1 flex-col justify-center rounded-md border shadow-xs sm:static sm:z-auto sm:flex'
      )}
    >
      <div className='flex flex-col items-center space-y-6'>
        <div className='border-border flex size-16 items-center justify-center rounded-full border-2'>
          <MessagesSquare className='size-8' />
        </div>
        <div className='space-y-2 text-center'>
          <h1 className='text-xl font-semibold'>Tus mensajes</h1>
          <p className='text-muted-foreground text-sm'>
            Selecciona una conversación o inicia una nueva.
          </p>
        </div>
        <Button onClick={() => setSearchClientDialog(true)}>
          Enviar mensaje
        </Button>
      </div>
    </div>
  )
}
