import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { channelCapabilities } from '@chat-crm/contracts'
import { claimChat } from '@/services/chat.service'
import { FileUp, MessagesSquare } from 'lucide-react'
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
import { useChats } from '../contexts/chats.context'
import { useChatThread } from '../hooks/use-chat-thread'
import { useComposerAttachments } from '../hooks/use-composer-attachments'
import { recentStickers } from '../lib/recent-stickers'
import { serviceWindowState } from '../lib/service-window'
import { useNow } from '../hooks/use-now'
import { ReplyWindowNotice } from './conversation/reply-window-notice'
import { useFileDrop } from '../hooks/use-file-drop'
import { useConversationSentiment } from '../hooks/use-conversation-sentiment'
import { useVisualViewportHeight } from '../hooks/use-visual-viewport-height'
import { AssignedUser } from './assigned-user'
import { CaseHeader } from './conversation/case-header'
import { ResolveCaseButton } from './conversation/resolve-case-button'
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

  // Case detail sheet (phones/tablets only): owned here because its trigger
  // lives in the header while the sheet lives with the rail.
  const [detailsOpen, setDetailsOpen] = useState(false)

  // The sheet describes one conversation: close it when the open chat
  // changes, so it never shows a stale case.
  useEffect(() => {
    setDetailsOpen(false)
  }, [chat?.id])

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
  })

  const capabilities = channelCapabilities(chat?.channelType)
  const attachments = useComposerAttachments(capabilities)
  const drop = useFileDrop({
    onFiles: (files) => attachments.add(files),
    disabled: !isConnected || !capabilities,
  })

  // Free-form replies only inside the channel's window (checked every 30 s).
  const now = useNow(30_000)
  const replyWindow =
    capabilities?.replyWindowMs && !thread.isLoading
      ? serviceWindowState(thread.messages, now, capabilities.replyWindowMs)
      : null
  const windowClosed =
    replyWindow?.kind === 'expired' || replyWindow?.kind === 'none'
      ? replyWindow.kind
      : null

  const stickers = useMemo(() => recentStickers(thread.messages), [thread.messages])

  // A tray belongs to one conversation: switching chats discards it.
  const { clear: clearAttachments } = attachments
  useEffect(() => clearAttachments(), [chat?.id, clearAttachments])

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
        // offering "Tomar chat". Never persist an empty owner id: without a
        // resolved member there is nothing honest to store.
        setChatSelected({
          ...chat,
          isUnassigned: false,
          ...(memberId
            ? {
                member: {
                  id: memberId,
                  username: auth.user?.username ?? null,
                },
              }
            : {}),
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
        // Sizing context for the case rail (`@rail/card:`): the thread, the
        // header and the rail all react to the room this card really has.
        '@container/card',
        mobile && 'start-0 flex'
      )}
    >
      <div className='flex min-h-0 flex-1 flex-col @rail/card:flex-row'>
        {/* Conversation column (also the drop zone for files) */}
        <div
          className='relative flex min-h-0 min-w-0 flex-1 flex-col'
          {...drop.dropProps}
        >
          {drop.isDragging && (
            <div
              aria-hidden
              className='bg-background/85 border-primary pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0'
            >
              <span className='bg-primary/10 text-primary grid size-14 place-items-center rounded-full'>
                <FileUp className='size-7' />
              </span>
              <p className='text-sm font-medium'>Suelta los archivos aquí</p>
              <p className='text-muted-foreground text-xs'>
                Fotos y videos se envían como media; lo demás, como documento.
              </p>
            </div>
          )}
          {/* Top Part */}
          <CaseHeader
            chat={chat}
            sentiment={sentimentData}
            taking={claim.isPending}
            onTake={() => claim.mutate()}
            onOpenDetails={() => setDetailsOpen(true)}
            resolveAction={<ResolveCaseButton conversationId={chat.id} />}
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
            onResendSticker={(sticker) =>
              thread.send({ type: 'sticker', attachmentId: sticker.attachmentId, previewUrl: sticker.url })
            }
          />

          <Composer
            connected={isConnected}
            onSend={thread.send}
            attachments={attachments}
            capabilities={capabilities}
            recentStickers={stickers}
            locked={windowClosed && <ReplyWindowNotice reason={windowClosed} />}
            status={chat.status}
          />
        </div>

        {/* Case detail: inline column when the card fits it, sheet below. */}
        <CaseRail
          chat={chat}
          messages={thread.messages}
          sentiment={sentimentData}
          onTake={() => claim.mutate()}
          taking={claim.isPending}
          currentMemberId={memberId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
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
