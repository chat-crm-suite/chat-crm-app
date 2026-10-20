import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { channelCapabilities } from '@chat-crm/contracts'
import { FileUp, MessagesSquare, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useSocket } from '@/context/socket-provider'
import { useMemberRole } from '@/hooks/use-member-role'
import { Button } from '@/components/ui/button'
import { useIaStatus } from '@/features/analytics/hooks/use-ia-status'
import { TaskDialog } from '@/features/tasks/components/task-dialog'
import { TemplatePicker } from '@/features/templates/components/template-picker'
import { useChats } from '../contexts/chats.context'
import { copy } from '../copy'
import { useChatThread } from '../hooks/use-chat-thread'
import { useComposerAttachments } from '../hooks/use-composer-attachments'
import { useConversationLifecycle } from '../hooks/use-conversation-lifecycle'
import { useConversationSentiment } from '../hooks/use-conversation-sentiment'
import { useFileDrop } from '../hooks/use-file-drop'
import { useNow } from '../hooks/use-now'
import { useVisualViewportHeight } from '../hooks/use-visual-viewport-height'
import { caseActionsFor } from '../lib/conversation-assignment'
import { recentStickers } from '../lib/recent-stickers'
import { conversationWindowState } from '../lib/service-window'
import { useTemplatePickerRequest } from '../lib/template-picker-request'
import type { Chat } from '../types/chat.domain'
import { AssigneePicker } from './conversation/assignee-picker'
import { AssignmentHistoryDialog } from './conversation/assignment-history-dialog'
import { CaseHeader } from './conversation/case-header'
import { CaseOptionsMenu } from './conversation/case-options-menu'
import { CaseRail } from './conversation/case-rail'
import { Composer } from './conversation/composer'
import { ReplyWindowNotice } from './conversation/reply-window-notice'
import { ResolveMenu, ResolveNoteDialog } from './conversation/resolve-menu'
import { ConversationThread } from './conversation/thread'

/**
 * Conversation pane of the inbox surface: header, thread, composer and the
 * case rail. All three share the surface's `bg-card`; only borders divide
 * them, so the list, the chat and the rail read as one product.
 */
function ConversationPane({ chat }: { chat: Chat }) {
  const { isConnected } = useSocket()
  const { role, memberId } = useMemberRole()
  const user = useAuthStore((state) => state.auth.user)
  const companyId = useAuthStore((state) => state.auth.company.id)
  const navigate = useNavigate()
  const { sentimentData, setChatSelected, setMobile } = useChats()
  const { available: iaAvailable } = useIaStatus()

  // Keep the phone overlay as tall as the visual viewport, so the composer
  // stays above the virtual keyboard (dvh fallback lives in index.css).
  useVisualViewportHeight()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  // Every overlay describes one conversation: close them when it changes.
  useEffect(() => {
    setDetailsOpen(false)
    setTemplateOpen(false)
    setTaskOpen(false)
    setHistoryOpen(false)
    setNoteOpen(false)
  }, [chat.id])

  // "Enviar plantilla" from the socket error toast targets the open chat.
  const pickerRequest = useTemplatePickerRequest((state) => state.seq)
  const seenRequest = useRef(pickerRequest)
  useEffect(() => {
    if (pickerRequest === seenRequest.current) return
    seenRequest.current = pickerRequest
    setTemplateOpen(true)
  }, [pickerRequest])

  const memberName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username

  const thread = useChatThread(chat.id, {
    companyId,
    sender: { id: memberId ?? user?.id ?? '', type: 'member' },
  })

  const channelType = chat.channel?.type ?? chat.channelType
  const capabilities = channelCapabilities(channelType)
  const attachments = useComposerAttachments(capabilities)
  const drop = useFileDrop({
    onFiles: (files) => attachments.add(files),
    disabled: !isConnected || !capabilities,
  })

  // Free-form replies only inside the channel's window (checked every 30 s).
  const now = useNow(30_000)
  const replyWindow = thread.isLoading
    ? null
    : conversationWindowState(
        chat,
        thread.messages,
        now,
        capabilities?.replyWindowMs
      )
  const windowClosed =
    replyWindow?.kind === 'expired' || replyWindow?.kind === 'none'
      ? replyWindow.kind
      : null
  const windowHours = capabilities?.replyWindowMs
    ? Math.round(capabilities.replyWindowMs / 3_600_000)
    : 24
  const openPicker = capabilities?.supportsTemplates
    ? () => setTemplateOpen(true)
    : undefined

  const stickers = useMemo(
    () => recentStickers(thread.messages),
    [thread.messages]
  )

  // A tray belongs to one conversation: switching chats discards it.
  const { clear: clearAttachments } = attachments
  useEffect(() => clearAttachments(), [chat.id, clearAttachments])

  // Customer tone only matters (and is only fetched) while the IA is on.
  useConversationSentiment(iaAvailable ? chat.id : undefined)

  const actions = caseActionsFor(chat, { role, memberId })
  const lifecycle = useConversationLifecycle(chat.id)
  const statusBusy =
    lifecycle.resolve.isPending ||
    lifecycle.setPending.isPending ||
    lifecycle.reopen.isPending
  const ownerBusy =
    lifecycle.take.isPending ||
    lifecycle.assign.isPending ||
    lifecycle.transfer.isPending ||
    lifecycle.release.isPending

  const customerName = chat.customer?.displayName ?? copy.customerFallback
  const viewContact = () =>
    void navigate({ to: '/customers', search: { customer: chat.customer.id } })

  return (
    <div className='@rail/card:flex-row flex min-h-0 flex-1 flex-col'>
      {/* Conversation column (also the drop zone for files) */}
      <div
        className='relative flex min-h-0 min-w-0 flex-1 flex-col'
        {...drop.dropProps}
      >
        {drop.isDragging && (
          <div
            aria-hidden
            className='bg-background/85 border-primary motion-safe:animate-in motion-safe:fade-in-0 pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed backdrop-blur-sm'
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

        <CaseHeader
          chat={chat}
          sentiment={sentimentData}
          showSentiment={iaAvailable}
          onOpenDetails={() => setDetailsOpen(true)}
          onBack={() => {
            setChatSelected(null)
            setMobile(false)
          }}
          assignee={
            <AssigneePicker
              chat={chat}
              actions={actions}
              busy={ownerBusy}
              onTake={() => lifecycle.take.mutate()}
              onRelease={() => lifecycle.release.mutate(undefined)}
              onAssign={(member) => lifecycle.assign.mutate(member)}
              onTransfer={(member, note) =>
                lifecycle.transfer.mutate({ member, note })
              }
            />
          }
          resolveAction={
            <ResolveMenu
              status={chat.status}
              allowed={actions.canChangeStatus}
              busy={statusBusy}
              onResolve={(note) => lifecycle.resolve.mutate(note)}
              onSetPending={() => lifecycle.setPending.mutate(undefined)}
              onReopen={() => lifecycle.reopen.mutate()}
            />
          }
          menu={
            <CaseOptionsMenu
              status={chat.status}
              priority={chat.priority}
              canChangeStatus={actions.canChangeStatus}
              onCreateTask={() => setTaskOpen(true)}
              onShowHistory={() => setHistoryOpen(true)}
              onViewContact={viewContact}
              onResolve={() => lifecycle.resolve.mutate(undefined)}
              onResolveWithNote={() => setNoteOpen(true)}
              onSetPending={() => lifecycle.setPending.mutate(undefined)}
              onReopen={() => lifecycle.reopen.mutate()}
              onSetPriority={(priority) =>
                lifecycle.setPriority.mutate(priority)
              }
            />
          }
        />

        <ConversationThread
          messages={thread.messages}
          loading={thread.isLoading}
          customerName={customerName}
          currentMemberId={memberId ?? undefined}
          currentMemberName={memberName}
          onRetry={thread.retry}
          onResendSticker={(sticker) =>
            thread.send({
              type: 'sticker',
              attachmentId: sticker.attachmentId,
              previewUrl: sticker.url,
            })
          }
        />

        <Composer
          connected={isConnected}
          onSend={thread.send}
          attachments={attachments}
          capabilities={capabilities}
          recentStickers={stickers}
          onPickTemplate={openPicker}
          onReopen={
            actions.canChangeStatus
              ? () => lifecycle.reopen.mutate()
              : undefined
          }
          locked={
            windowClosed && (
              <ReplyWindowNotice
                reason={windowClosed}
                windowHours={windowHours}
                onPickTemplate={openPicker}
              />
            )
          }
          status={chat.status}
        />
      </div>

      <CaseRail
        chat={chat}
        messages={thread.messages}
        sentiment={sentimentData}
        showSentiment={iaAvailable}
        actions={actions}
        onTake={() => lifecycle.take.mutate()}
        taking={lifecycle.take.isPending}
        onPickTemplate={openPicker}
        onCreateTask={() => setTaskOpen(true)}
        onViewContact={viewContact}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <TemplatePicker
        conversationId={chat.id}
        channelId={chat.channel?.id || null}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        link={{
          conversationId: chat.id,
          customerId: chat.customer.id || undefined,
          customerName,
        }}
      />
      <AssignmentHistoryDialog
        conversationId={chat.id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      <ResolveNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        busy={lifecycle.resolve.isPending}
        onConfirm={(note) => lifecycle.resolve.mutate(note)}
      />
    </div>
  )
}

export const ChatBox = () => {
  const { chatSelected: chat, mobile, setSearchClientDialog } = useChats()

  if (!chat) {
    return (
      <div className='hidden min-w-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center sm:flex'>
        <span className='bg-muted text-muted-foreground grid size-14 place-items-center rounded-full'>
          <MessagesSquare className='size-7' aria-hidden />
        </span>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold'>{copy.emptyTitle}</h2>
          <p className='text-muted-foreground max-w-xs text-sm'>
            {copy.emptyBody}
          </p>
        </div>
        <Button onClick={() => setSearchClientDialog(true)}>
          <Plus className='size-4' />
          {copy.emptyAction}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-card absolute inset-0 start-full z-50 hidden w-full min-w-0',
        'flex-1 flex-col overflow-hidden sm:static sm:z-auto sm:flex',
        // Keyboard-aware height on phones: dvh / visualViewport variable.
        'max-sm:h-(--chat-viewport-height)',
        // Sizing context for the case rail (`@rail/card:`): the thread, the
        // header and the rail react to the room this pane really has.
        '@container/card',
        mobile && 'start-0 flex'
      )}
    >
      <ConversationPane chat={chat} />
    </div>
  )
}
