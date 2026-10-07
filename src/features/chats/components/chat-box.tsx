import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimChat } from '@/services/chat.service'
import { MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  assignmentToastId,
  clearSelfInitiatedAssignment,
  markSelfInitiatedAssignment,
} from '@/lib/socket-taxonomy'
import { cn } from '@/lib/utils'
import { useSocket } from '@/context/socket-provider'
import { Button } from '@/components/ui/button'
import { useChats } from '../contexts/chats.provider'
import { useChatThread } from '../hooks/use-chat-thread'
import { useConversationSentiment } from '../hooks/use-conversation-sentiment'
import { useVisualViewportHeight } from '../hooks/use-visual-viewport-height'
import { AssignedUser } from './assigned-user'
import { CaseHeader } from './conversation/case-header'
import { CaseRail } from './conversation/case-rail'
import { Composer } from './conversation/composer'
import { ConversationThread } from './conversation/thread'

export const ChatBox = () => {
  const { auth } = useAuthStore()
  const { isConnected } = useSocket()
  const {
    sentimentData,
    chatSelected: chat,
    setChatSelected,
    mobile,
    setMobile,
    setSearchClientDialog,
  } = useChats()

  // Keep the phone overlay as tall as the visual viewport, so the composer
  // stays above the virtual keyboard (dvh fallback lives in index.css).
  useVisualViewportHeight()

  const membership = auth.user?.memberships?.find(
    (m) => m.companyId === auth.company.id
  )
  const memberId = membership?.id ?? auth.user?.id
  const memberName =
    [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ') ||
    auth.user?.username

  const thread = useChatThread(chat?.id, {
    companyId: auth.company.id,
    sender: { id: memberId ?? '', type: 'member' },
    to: chat?.customer?.phone ?? '',
  })

  // Real customer tone of the open conversation: REST + live refetch, synced
  // into the chats context that feeds the tone control.
  useConversationSentiment(chat?.id)

  const queryClient = useQueryClient()
  const claim = useMutation({
    mutationFn: () => claimChat(chat!.id),
    // Own action: mark before the request so the `conversation:assigned` echo
    // is silenced; the mutation itself shows the toast (T6).
    onMutate: () => {
      if (chat) markSelfInitiatedAssignment(chat.id)
    },
    onSuccess: () => {
      toast.success('Chat asignado a tu nombre', {
        id: chat ? assignmentToastId(chat.id) : undefined,
      })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
      if (chat) {
        // The claim assigns the chat to the signed-in member: clearing only
        // `isUnassigned` would leave `member: null` and the rail would keep
        // offering "Tomar chat".
        setChatSelected({
          ...chat,
          isUnassigned: false,
          member: {
            id: memberId ?? '',
            username: auth.user?.username ?? null,
          },
        })
      }
    },
    onError: (error) => {
      if (chat) clearSelfInitiatedAssignment(chat.id)
      toast.error(getApiErrorMessage(error, 'No se pudo tomar el chat'))
      void queryClient.invalidateQueries({ queryKey: ['chat', 'unassigned'] })
    },
  })

  const customerName = chat?.customer?.displayName ?? 'Cliente'

  return chat ? (
    <div
      className={cn(
        'bg-background absolute inset-0 start-full z-50 hidden w-full',
        'flex-1 flex-col overflow-hidden border shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
        // Keyboard-aware height on phones: dvh / visualViewport variable.
        'max-sm:h-(--chat-viewport-height)',
        mobile && 'start-0 flex'
      )}
    >
      <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
        {/* Conversation column */}
        <div className='flex min-h-0 flex-1 flex-col'>
          {/* Top Part */}
          <CaseHeader
            chat={chat}
            sentiment={sentimentData}
            taking={claim.isPending}
            onTake={() => claim.mutate()}
            onBack={() => {
              setChatSelected(null)
              setMobile(false)
            }}
          >
            <AssignedUser conversationId={chat.id} />
          </CaseHeader>

          <ConversationThread
            messages={thread.messages}
            loading={thread.isLoading}
            customerName={customerName}
            currentMemberId={memberId}
            currentMemberName={memberName}
            onRetry={thread.retry}
          />

          <Composer connected={isConnected} onSend={thread.send} />
        </div>

        {/* Case rail: wide screens only, phones keep the full-width thread. */}
        <CaseRail
          chat={chat}
          messages={thread.messages}
          sentiment={sentimentData}
          onTake={() => claim.mutate()}
          taking={claim.isPending}
        />
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
