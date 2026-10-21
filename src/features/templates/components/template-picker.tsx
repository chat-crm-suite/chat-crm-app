import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendConversationTemplate } from '@/services/chat.service'
import { SendTemplateSchema, type Template } from '@chat-crm/contracts'
import { ArrowLeft } from 'lucide-react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { conversationErrorMessage } from '@/features/chats/lib/conversation-errors'
import { getApiError } from '@/features/workspace/api-error-code'
import { copy } from '../copy'
import { useApprovedTemplates } from '../template-queries'
import {
  TemplateFields,
  templateParams,
  useTemplateParams,
} from './template-fields'
import {
  TemplateHeaderMediaField,
  useTemplateHeaderMedia,
  type TemplateHeaderMediaState,
} from './template-header-media-field'
import { TemplateList } from './template-list'
import { TemplatePreview } from './template-preview'

/**
 * Template chooser + variable form + live preview, without the sending part:
 * shared by the chat picker and the "Nuevo chat" template step.
 */
export function TemplateComposer({
  channelId,
  selected,
  onSelect,
  params,
  onParamChange,
  header,
  className,
}: {
  channelId: string | null
  selected: Template | null
  onSelect: (template: Template | null) => void
  params: Readonly<Record<string, string>>
  onParamChange: (key: string, value: string) => void
  /** Header file state (`useTemplateHeaderMedia`) for media headers. */
  header: TemplateHeaderMediaState
  className?: string
}) {
  const idPrefix = useId()
  const templates = useApprovedTemplates(channelId)

  return (
    <div
      className={cn(
        'grid min-h-0 gap-4 md:grid-cols-[15rem_minmax(0,1fr)]',
        className
      )}
    >
      <TemplateList
        templates={templates.data ?? []}
        loading={templates.isPending && !!channelId}
        error={templates.isError}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        className={cn('max-h-80 md:max-h-[26rem]', selected && 'max-md:hidden')}
      />
      <div className={cn('min-w-0 space-y-4', !selected && 'max-md:hidden')}>
        {selected ? (
          <>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='-ms-2 h-11 md:hidden'
              onClick={() => onSelect(null)}
            >
              <ArrowLeft className='size-4' />
              {copy.pickerBack}
            </Button>
            <TemplatePreview
              components={selected.components}
              params={params}
              headerFile={header.preview}
              cardFiles={header.cardPreviews}
            />
            <TemplateHeaderMediaField template={selected} header={header} />
            <TemplateFields
              template={selected}
              params={params}
              onChange={onParamChange}
              idPrefix={idPrefix}
            />
          </>
        ) : (
          <p className='text-muted-foreground flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm'>
            {copy.pickerChoose}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Send an approved template into an open conversation
 * (`POST /conversations/:id/template`). The message itself arrives through
 * the socket like any outbound message, so the dialog only closes.
 */
export function TemplatePicker({
  conversationId,
  channelId,
  open,
  onOpenChange,
}: {
  conversationId: string
  channelId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selected, setSelected] = useState<Template | null>(null)
  const { params, setParam, missing, reset } = useTemplateParams(selected)
  const header = useTemplateHeaderMedia(selected)

  const close = () => {
    setSelected(null)
    reset()
    header.clear()
    onOpenChange(false)
  }

  const send = useMutation({
    mutationFn: (template: Template) =>
      sendConversationTemplate(
        conversationId,
        SendTemplateSchema.parse({
          templateId: template.id,
          params: templateParams(template, params),
          headerMedia: header.headerMedia,
          cards: header.cards,
          clientMessageId: nanoid(),
        })
      ),
    onSuccess: () => {
      toast.success(copy.pickerSent)
      close()
    },
    onError: (error) => {
      toast.error(conversationErrorMessage(error, copy.pickerError))
      const { code } = getApiError(error)
      // A template that vanished meanwhile cannot be retried as is.
      if (code === 'template_unavailable' || code === 'template_unsendable') {
        setSelected(null)
      }
      // An expired or wrong header file must be chosen again.
      if (code === 'template_header_media_mismatch') header.clear()
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent className='max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{copy.pickerTitle}</DialogTitle>
          <DialogDescription>{copy.pickerDescription}</DialogDescription>
        </DialogHeader>
        <TemplateComposer
          channelId={channelId}
          selected={selected}
          onSelect={setSelected}
          params={params}
          onParamChange={setParam}
          header={header}
        />
        <DialogFooter className='items-center gap-3 sm:justify-between'>
          <p className='text-muted-foreground text-xs' aria-live='polite'>
            {selected && missing.length > 0
              ? copy.pickerMissing(missing.length)
              : selected && header.missing
                ? copy.pickerMissingHeader
                : ''}
          </p>
          <Button
            type='button'
            className='h-11 sm:h-9'
            disabled={
              !selected ||
              missing.length > 0 ||
              header.missing ||
              send.isPending
            }
            onClick={() => selected && send.mutate(selected)}
          >
            {send.isPending ? copy.pickerSending : copy.pickerSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
