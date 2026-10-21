import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  channelCapabilities,
  type StagedUpload,
  type Template,
} from '@chat-crm/contracts'
import { CircleCheck, Paperclip, X } from 'lucide-react'
import { uploadTemplateHeader } from '@/services/template.service'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '@/features/chats/lib/attachment-meta'
import { uploadErrorMessage } from '@/features/chats/lib/upload-errors'
import { HEADER_MEDIA_LABEL, copy } from '../copy'
import type { HeaderFilePreview } from './template-preview'

type HeaderUpload =
  | { status: 'idle' }
  | { status: 'uploading'; file: File; url: string; progress: number | null }
  | { status: 'ready'; file: File; url: string; upload: StagedUpload }
  | { status: 'error'; file: File | null; url: string | null; message: string }

const IDLE: HeaderUpload = { status: 'idle' }

const normalized = (mime: string) => mime.split(';')[0].trim().toLowerCase()

/** Upload rule of the header kind on the template's channel. */
function headerRule(template: Template) {
  if (!template.headerMedia) return null
  return channelCapabilities(template.channelType)?.media[template.headerMedia] ?? null
}

/**
 * The header file of the chosen template: validated against the channel's
 * rule, staged right away (`POST /templates/:id/header-upload`) so sending
 * only references its `uploadId`. Switching template starts clean.
 */
export function useTemplateHeaderMedia(template: Template | null) {
  const [state, setState] = useState<{ id: string | null; value: HeaderUpload }>({
    id: null,
    value: IDLE,
  })
  const value = state.id === template?.id ? state.value : IDLE
  const abortRef = useRef<AbortController | null>(null)
  const { mutate: stage } = useMutation({
    mutationFn: ({
      templateId,
      file,
      signal,
    }: {
      templateId: string
      file: File
      signal: AbortSignal
    }) =>
      uploadTemplateHeader(templateId, file, {
        signal,
        onProgress: (progress) =>
          setState((previous) =>
            previous.value.status === 'uploading' && previous.value.file === file
              ? { ...previous, value: { ...previous.value, progress } }
              : previous
          ),
      }),
  })

  // A replaced or dropped file frees its local preview.
  const url = 'url' in value ? value.url : null
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  useEffect(() => () => abortRef.current?.abort(), [])

  const choose = useCallback(
    (file: File) => {
      if (!template?.headerMedia) return
      abortRef.current?.abort()
      const set = (next: HeaderUpload) => setState({ id: template.id, value: next })

      const rule = headerRule(template)
      if (!rule?.mimeTypes.includes(normalized(file.type))) {
        set({
          status: 'error',
          file: null,
          url: null,
          message: `«${file.name}» no es un formato admitido para este encabezado.`,
        })
        return
      }
      if (file.size > rule.maxBytes) {
        set({
          status: 'error',
          file: null,
          url: null,
          message: `«${file.name}» supera ${formatFileSize(rule.maxBytes)}.`,
        })
        return
      }

      const preview = URL.createObjectURL(file)
      const controller = new AbortController()
      abortRef.current = controller
      set({ status: 'uploading', file, url: preview, progress: null })
      stage(
        { templateId: template.id, file, signal: controller.signal },
        {
          onSuccess: (staged) =>
            setState((previous) =>
              'file' in previous.value && previous.value.file === file
                ? { ...previous, value: { status: 'ready', file, url: preview, upload: staged } }
                : previous
            ),
          onError: (error) => {
            if (controller.signal.aborted) return
            setState((previous) =>
              'file' in previous.value && previous.value.file === file
                ? {
                    ...previous,
                    value: {
                      status: 'error',
                      file,
                      url: preview,
                      message: uploadErrorMessage(error),
                    },
                  }
                : previous
            )
          },
        }
      )
    },
    [template, stage]
  )

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setState({ id: null, value: IDLE })
  }, [])

  const preview: HeaderFilePreview | null =
    template?.headerMedia && 'file' in value && value.file && value.url
      ? { mediaType: template.headerMedia, url: value.url, name: value.file.name }
      : null

  return {
    state: value,
    choose,
    clear,
    preview,
    /** The template needs a file that is not staged yet. */
    missing: !!template?.headerMedia && value.status !== 'ready',
    /** `SendTemplateInput.headerMedia`, once staged. */
    headerMedia:
      value.status === 'ready' ? { uploadId: value.upload.uploadId } : undefined,
  }
}

export type TemplateHeaderMediaState = ReturnType<typeof useTemplateHeaderMedia>

/** File picker of a media header: kind, formats, size and upload status. */
export function TemplateHeaderMediaField({
  template,
  header,
}: {
  template: Template
  header: TemplateHeaderMediaState
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  if (!template.headerMedia) return null

  const rule = headerRule(template)
  const label = HEADER_MEDIA_LABEL[template.headerMedia]
  const { state } = header
  const formats = (rule?.mimeTypes ?? [])
    .map((mime) => mime.split('/')[1]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 4)
    .join(', ')

  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id} className='text-xs font-medium'>
        {label}
      </Label>
      <input
        ref={inputRef}
        id={id}
        type='file'
        className='sr-only'
        accept={rule?.mimeTypes.join(',')}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) header.choose(file)
          event.target.value = ''
        }}
      />
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-11 sm:h-9'
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className='size-4' aria-hidden />
          {state.status === 'idle' ? copy.headerChoose : copy.headerReplace}
        </Button>
        {'file' in state && state.file && (
          <span className='min-w-0 flex-1 truncate text-sm'>{state.file.name}</span>
        )}
        {state.status !== 'idle' && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-11 sm:size-9'
            aria-label={copy.headerRemove}
            onClick={header.clear}
          >
            <X className='size-4' />
          </Button>
        )}
      </div>
      <div aria-live='polite' className='text-xs'>
        {state.status === 'uploading' && (
          <div className='space-y-1'>
            <span className='text-muted-foreground'>{copy.headerUploading}</span>
            <Progress value={(state.progress ?? 0) * 100} className='h-1' />
          </div>
        )}
        {state.status === 'ready' && (
          <span className='text-muted-foreground flex items-center gap-1'>
            <CircleCheck className='size-3.5 text-(--positive)' aria-hidden />
            {copy.headerReady}
          </span>
        )}
        {state.status === 'error' && (
          <p role='alert' className='text-destructive'>
            {state.message}
          </p>
        )}
        {state.status === 'idle' && rule && (
          <span className='text-muted-foreground'>
            {copy.headerHint(formats, formatFileSize(rule.maxBytes) ?? '')}
          </span>
        )}
      </div>
    </div>
  )
}
