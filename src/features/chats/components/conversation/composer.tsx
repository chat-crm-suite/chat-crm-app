import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { FileText, ImagePlus, Mic, Paperclip, SendHorizontal, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import type { ChannelCapabilities } from '@chat-crm/contracts'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ComposerAttachments } from '../../hooks/use-composer-attachments'
import { canRecordVoice, useVoiceRecorder } from '../../hooks/use-voice-recorder'
import { acceptFor, type AttachIntent } from '../../lib/attachment-candidate'
import type { OutgoingDraft } from '../../lib/outgoing-draft'
import type { ConversationStatus } from '../../types/chat.domain'
import { AttachmentTray } from './attachment-tray'
import { QuickReplies } from './quick-replies'
import { RecordingBar } from './recording-bar'
import { ResolvedNotice } from './resolved-notice'

export function Composer({
  connected,
  onSend,
  attachments,
  capabilities,
  status = 'open',
  locked,
  className,
}: {
  connected: boolean
  onSend: (draft: OutgoingDraft) => void
  /** Send tray shared with the conversation's drop zone. */
  attachments: ComposerAttachments
  capabilities: ChannelCapabilities | null
  status?: ConversationStatus
  /** Free-form sending is closed (e.g. the 24 h window expired): why. */
  locked?: ReactNode
  className?: string
}) {
  const [value, setValue] = useState('')
  const fieldId = useId()
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const mediaInput = useRef<HTMLInputElement>(null)
  const documentInput = useRef<HTMLInputElement>(null)
  /** Caret offset requested by the last quick-reply insertion. */
  const pendingCaret = useRef<number | null>(null)
  const resolved = status === 'closed'
  const disabled = !connected || !!locked
  const canAttach = !disabled && !!capabilities
  const hasText = value.trim().length > 0
  const recorder = useVoiceRecorder()
  const [canRecord] = useState(canRecordVoice)
  const isRecording = recorder.state !== 'idle' && recorder.state !== 'denied'

  useEffect(() => {
    if (recorder.state !== 'denied') return
    toast.error('No hay acceso al micrófono', {
      description:
        'Permite el micrófono desde el icono de la barra de direcciones del navegador y vuelve a intentarlo.',
    })
    recorder.dismissDenied()
  }, [recorder])

  const sendVoice = async () => {
    const note = await recorder.finish()
    if (!note || disabled) return
    onSend({ type: 'audio', file: note.file, voice: true, durationMs: note.durationMs })
  }

  // The textarea is controlled: the caret can only land once React has written
  // the spliced value, so apply the pending offset right after that commit.
  useLayoutEffect(() => {
    const caret = pendingCaret.current
    if (caret === null) return
    pendingCaret.current = null
    fieldRef.current?.setSelectionRange(caret, caret)
  })

  const send = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend({ type: 'text', text })
    setValue('')
  }

  const sendFiles = () => {
    if (disabled) return
    for (const draft of attachments.take()) onSend(draft)
    fieldRef.current?.focus()
  }

  /**
   * Inserts a quick-reply draft at the caret, keeping the surrounding text,
   * and leaves the caret after the draft for editing. Never submits.
   */
  const insertDraft = (draft: string) => {
    const field = fieldRef.current
    const start = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? start
    pendingCaret.current = start + draft.length
    setValue(value.slice(0, start) + draft + value.slice(end))
    field?.focus()
  }

  const pick = (intent: AttachIntent) =>
    (intent === 'media' ? mediaInput : documentInput).current?.click()

  const fileInput = (intent: AttachIntent, ref: typeof mediaInput) => (
    <input
      ref={ref}
      type='file'
      multiple
      hidden
      accept={acceptFor(capabilities, intent)}
      data-testid={`${intent}-input`}
      onChange={(event) => {
        attachments.add(Array.from(event.target.files ?? []), intent)
        event.target.value = ''
      }}
    />
  )

  return (
    <div
      className={cn(
        'bg-card flex-none border-t ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'sm:ps-4 sm:pe-4 sm:pt-4 sm:pb-4',
        className
      )}
    >
      {fileInput('media', mediaInput)}
      {fileInput('document', documentInput)}

      {isRecording ? (
        <RecordingBar recorder={recorder} onSend={() => void sendVoice()} disabled={disabled} />
      ) : attachments.items.length > 0 ? (
        <AttachmentTray
          attachments={attachments}
          onSend={sendFiles}
          onAddMore={() => pick('media')}
          disabled={disabled}
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          {resolved && <ResolvedNotice />}
          {locked}
          {!resolved && !locked && (
            <QuickReplies disabled={!connected} onInsert={insertDraft} />
          )}

          <label htmlFor={fieldId} className='sr-only'>
            Escribe un mensaje
          </label>
          <InputGroup className='rounded-2xl'>
            <InputGroupTextarea
              id={fieldId}
              ref={fieldRef}
              rows={1}
              value={value}
              disabled={disabled}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files)
                if (!files.length || !canAttach) return
                event.preventDefault()
                attachments.add(files)
              }}
              placeholder={
                !connected ? 'Reconectando…' : locked ? 'Envío de texto libre cerrado' : 'Escribe un mensaje…'
              }
              className='caret-primary max-h-32 min-h-11 py-2.5 text-sm'
            />
            <InputGroupAddon align='inline-start' className='self-end pb-1.5'>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton
                        size='icon-sm'
                        disabled={!canAttach}
                        aria-label='Adjuntar'
                        className='rounded-full max-sm:size-11'
                      >
                        <Paperclip className='size-[18px]' />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Adjuntar (también puedes pegar o soltar archivos)</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align='start' side='top'>
                  <DropdownMenuItem onSelect={() => pick('media')}>
                    <ImagePlus />
                    Fotos y videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => pick('document')}>
                    <FileText />
                    Documento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </InputGroupAddon>
            <InputGroupAddon align='inline-end' className='self-end pb-1.5'>
              {!hasText && canRecord && capabilities?.media.audio ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      size='icon'
                      variant='secondary'
                      onClick={() => void recorder.start()}
                      disabled={!canAttach}
                      aria-label='Grabar nota de voz'
                      className='size-11 shrink-0 rounded-full sm:size-9'
                    >
                      <Mic className='size-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grabar nota de voz</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='submit'
                      size='icon'
                      className='size-11 shrink-0 rounded-full sm:size-9'
                      disabled={disabled || !hasText}
                      aria-label='Enviar mensaje'
                    >
                      <SendHorizontal className='size-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Kbd>Enter</Kbd> envía · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> salto de línea
                  </TooltipContent>
                </Tooltip>
              )}
            </InputGroupAddon>
          </InputGroup>
        </form>
      )}

      {!connected && (
        <p role='status' className='text-muted-foreground mt-2 flex items-center gap-1.5 text-xs'>
          <WifiOff className='text-destructive size-3.5 shrink-0' aria-hidden />
          Sin conexión con el socket. El envío se reactiva al reconectar.
        </p>
      )}
    </div>
  )
}
