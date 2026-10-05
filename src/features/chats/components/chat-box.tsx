import { useState } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ImagePlus,
  MessagesSquare,
  MoreVertical,
  Paperclip,
  Send,
} from 'lucide-react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { useSocket } from '@/context/socket-provider'
import { claimChat } from '@/services/chat.service'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '../api'
import { chatBuilder } from '../builders/chat.builder'
import { messageBuilder } from '../builders/message.builder'
import { useChats } from '../contexts/chats.provider'
import { getMessageStrategy } from '../strategies/message.strategy'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents } from '../types/socket.api'
import { AssignedUser } from './assigned-user'
import { renderMessage } from './message/render'
import { SentimentIndicator } from './sentiment-indicator'

export const ChatBox = () => {
  const { auth } = useAuthStore()
  const { socket } = useSocket()
  const {
    sentimentData,
    chatSelected: chat,
    setChatSelected,
    mobile,
    setMobile,
    setSearchClientDialog,
  } = useChats()

  const handleSendMessage = (body: string) => {
    if (!chat) return

    const memberId =
      auth.user?.memberships?.find((m) => m.companyId === auth.company.id)
        ?.id ?? auth.user?.id

    const payload = messageBuilder
      .chat(chat.id)
      .sender(memberId ?? '', 'member')
      .to(chat.customer.phone ?? '')
      .text(body)

    socket?.emit(ChatSocketEvents.sendMessage, payload)
  }

  const [messageInput, setMessageInput] = useState<string>('')

  const { data: messages } = useQuery({
    queryKey: ['chat', chat?.id, 'messages'],
    queryFn: () => api.queries.messages.get(chat!.id),
    enabled: !!chat?.id,
    select: (m) => messageBuilder.group.date(m),
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

  return chat ? (
    <div
      className={cn(
        'bg-background absolute inset-0 start-full z-50 hidden w-full',
        'flex-1 flex-col border shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        mobile && 'start-0 flex'
      )}
    >
      {/* Top Part */}
      <div className='bg-card mb-1 flex flex-none justify-between p-4 shadow-lg sm:rounded-t-md'>
        {/* Left */}
        <div className='flex gap-3'>
          <Button
            size='icon'
            variant='ghost'
            className='-ms-2 h-full sm:hidden'
            onClick={() => {
              setChatSelected(null)
              setMobile(false)
            }}
          >
            <ArrowLeft className='rtl:rotate-180' />
          </Button>
          <div className='flex items-center gap-2 lg:gap-4'>
            <Avatar className='size-9 lg:size-11'>
              <AvatarFallback className='font-bold'>
                {chat.customer?.displayName?.charAt(0) ?? 'N/A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className='col-start-2 row-span-2 text-sm font-medium lg:text-base'>
                {chat.customer?.displayName ?? 'Desconocido'}
              </span>
              <span
                className={cn(
                  'text-muted-foreground col-start-2 row-span-2 row-start-2',
                  'line-clamp-1 block max-w-32 text-xs text-nowrap text-ellipsis lg:max-w-none lg:text-sm'
                )}
              >
                {parsePhoneNumber(
                  chat.customer.phone ?? '',
                  'PE'
                )?.formatInternational() || chat.customer.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className='-me-1 flex items-center gap-1 lg:gap-2'>
          {/* here */}
          <SentimentIndicator sentiment={sentimentData} />
          {chat.isUnassigned && (
            <Button
              size='sm'
              className='h-8'
              onClick={() => claim.mutate()}
              disabled={claim.isPending}
            >
              {claim.isPending ? 'Tomando…' : 'Tomar chat'}
            </Button>
          )}
          <AssignedUser conversationId={chat.id} />
          <Button
            size='icon'
            variant='ghost'
            className='h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6'
          >
            <MoreVertical className='stroke-muted-foreground sm:size-5' />
          </Button>
        </div>
      </div>

      {/* Conversation */}
      <div className='flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4'>
        <div className='flex size-full flex-1'>
          <div className='chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden'>
            <div className='chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4'>
              {messages &&
                Object.keys(messages).map((key) => (
                  <Fragment key={key}>
                    {messages[key].map((msg, index) => (
                      <ChatMessageItem
                        key={`${msg.timestamp}-${index}`}
                        msg={msg}
                        isClient={msg.sender.type === 'customer'}
                      />
                    ))}
                    <div className='text-center text-xs'>
                      {chatBuilder.label.date(key)}
                    </div>
                  </Fragment>
                ))}
            </div>
          </div>
        </div>
        <form
          className='flex w-full flex-none gap-2'
          onSubmit={(e) => {
            e.preventDefault()
            if (messageInput) {
              handleSendMessage(messageInput)
              setMessageInput('')
            }
          }}
        >
          <div
            className={cn(
              'border-input bg-card focus-within:ring-ring flex flex-1 items-center',
              'gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:outline-hidden lg:gap-4'
            )}
          >
            <div className='space-x-1'>
              <Button
                size='icon'
                type='button'
                variant='ghost'
                className='hidden h-8 rounded-md lg:inline-flex'
              >
                <ImagePlus size={20} className='stroke-muted-foreground' />
              </Button>
              <Button
                size='icon'
                type='button'
                variant='ghost'
                className='hidden h-8 rounded-md lg:inline-flex'
              >
                <Paperclip size={20} className='stroke-muted-foreground' />
              </Button>
            </div>
            <label className='flex-1'>
              <span className='sr-only'>Chat Text Box</span>
              <Input
                placeholder='Type your messages...'
                className='h-8 w-full bg-inherit focus-visible:outline-hidden'
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
            </label>
            <Button
              variant='ghost'
              size='icon'
              className='hidden sm:inline-flex'
            >
              <Send size={20} />
            </Button>
          </div>
          <Button className='h-full sm:hidden'>
            <Send size={18} /> Send
          </Button>
        </form>
      </div>
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
          <h1 className='text-xl font-semibold'>Your messages</h1>
          <p className='text-muted-foreground text-sm'>
            Send a message to start a chat.
          </p>
        </div>
        <Button onClick={() => setSearchClientDialog(true)}>
          Send message
        </Button>
      </div>
    </div>
  )
}

const ChatMessageItem = ({
  msg,
  isClient,
}: {
  msg: ChatMessage
  isClient: boolean
}) => {
  const { text, url } = getMessageStrategy(msg.msg.type).getRenderData(msg.msg)
  const isMedia = msg.msg.type !== 'text'
  // Media without url (e.g. failed download): placeholder instead of a
  // broken `<img>` / download request to ".../null".
  const Message =
    (isMedia && !url ? renderMessage.text : renderMessage[msg.msg.type]) ??
    renderMessage.text!
  const label = isMedia && !url ? 'Archivo no disponible' : text

  return (
    <div
      className={cn(
        msg.msg.type !== 'text' ? 'p-1' : 'px-3 py-2',
        isClient
          ? 'bg-muted self-start rounded-[16px_16px_16px_0]'
          : 'bg-primary/90 text-primary-foreground/75 self-end rounded-[16px_16px_0_16px]',
        'relative flex max-w-6/10 flex-row break-words shadow-lg'
      )}
    >
      <Message text={label} caption={label} url={url} time={msg.timestamp} />
    </div>
  )
}
