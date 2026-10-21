import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  channelCapabilities,
  templateCardMedia,
  type SendTemplateInput,
  type StagedUpload,
  type Template,
  type TemplateHeaderMedia,
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

/**
 * One file a template send needs: its header (`key: 'header'`) or the
 * header of a carousel card (`key: 'card:<n>'`, staged with `?card=<n>`).
 */
export interface HeaderFileSlot {
  key: string
  kind: TemplateHeaderMedia
  card?: number
  label: string
}

const normalized = (mime: string) => mime.split(';')[0].trim().toLowerCase()

/** Upload rule of a file kind on the template's channel. */
function kindRule(template: Template, kind: TemplateHeaderMedia) {
  return channelCapabilities(template.channelType)?.media[kind] ?? null
}

/** Every file the template needs, header first, then cards in order. */
function fileSlots(template: Template | null): HeaderFileSlot[] {
  if (!template) return []
  const slots: HeaderFileSlot[] = template.headerMedia
    ? [{ key: 'header', kind: template.headerMedia, label: HEADER_MEDIA_LABEL[template.headerMedia] }]
    : []
  templateCardMedia(template.components).forEach((kind, card) => {
    if (kind) slots.push({ key: `card:${card}`, kind, card, label: copy.cardFileLabel(kind, card) })
  })
  return slots
}

/**
 * The header files of the chosen template (its header and/or each carousel
 * card): validated against the channel's rule and staged right away
 * (`POST /templates/:id/header-upload`), so sending only references their
 * `uploadId`s. Files upload independently; switching template starts clean.
 */
export function useTemplateHeaderMedia(template: Template | null) {
  const [state, setState] = useState<{
    id: string | null
    files: Readonly<Record<string, HeaderUpload>>
  }>({ id: null, files: {} })
  const files = state.id === template?.id ? state.files : {}
  const aborts = useRef(new Map<string, AbortController>())

  const fileOf = (key: string) => files[key] ?? IDLE

  // Replaced or dropped files free their local previews.
  const urls = Object.values(files)
    .map((file) => ('url' in file ? file.url : null))
    .filter((url): url is string => !!url)
    .join('\n')
  useEffect(
    () => () => {
      for (const url of urls.split('\n')) if (url) URL.revokeObjectURL(url)
    },
    [urls]
  )
  useEffect(() => {
    const pending = aborts.current
    return () => pending.forEach((controller) => controller.abort())
  }, [])

  const choose = useCallback(
    (slot: HeaderFileSlot, file: File) => {
      if (!template) return
      aborts.current.get(slot.key)?.abort()
      /** Applies `next` only while this file is still the slot's file. */
      const update = (next: (current: HeaderUpload) => HeaderUpload | null) =>
        setState((previous) => {
          if (previous.id !== template.id) return previous
          const value = next(previous.files[slot.key] ?? IDLE)
          return value ? { ...previous, files: { ...previous.files, [slot.key]: value } } : previous
        })
      const reset = (value: HeaderUpload) =>
        setState((previous) => ({
          id: template.id,
          files: { ...(previous.id === template.id ? previous.files : {}), [slot.key]: value },
        }))
      const isCurrent = (current: HeaderUpload) => 'file' in current && current.file === file

      const rule = kindRule(template, slot.kind)
      if (!rule?.mimeTypes.includes(normalized(file.type))) {
        reset({ status: 'error', file: null, url: null, message: copy.headerBadFormat(file.name) })
        return
      }
      if (file.size > rule.maxBytes) {
        reset({
          status: 'error',
          file: null,
          url: null,
          message: copy.headerTooLarge(file.name, formatFileSize(rule.maxBytes) ?? ''),
        })
        return
      }

      const preview = URL.createObjectURL(file)
      const controller = new AbortController()
      aborts.current.set(slot.key, controller)
      reset({ status: 'uploading', file, url: preview, progress: null })

      uploadTemplateHeader(template.id, file, {
        card: slot.card,
        signal: controller.signal,
        onProgress: (progress) =>
          update((current) =>
            current.status === 'uploading' && current.file === file
              ? { ...current, progress }
              : null
          ),
      }).then(
        (upload) =>
          update((current) =>
            isCurrent(current) ? { status: 'ready', file, url: preview, upload } : null
          ),
        (error: unknown) => {
          if (controller.signal.aborted) return
          update((current) =>
            isCurrent(current)
              ? { status: 'error', file, url: preview, message: uploadErrorMessage(error) }
              : null
          )
        }
      )
    },
    [template]
  )

  const clearSlot = useCallback((key: string) => {
    aborts.current.get(key)?.abort()
    setState((previous) => {
      const { [key]: _dropped, ...rest } = previous.files
      return { ...previous, files: rest }
    })
  }, [])

  const clear = useCallback(() => {
    aborts.current.forEach((controller) => controller.abort())
    aborts.current.clear()
    setState({ id: null, files: {} })
  }, [])

  const slots = fileSlots(template)
  const previewOf = (slot: HeaderFileSlot | undefined): HeaderFilePreview | null => {
    const value = slot ? fileOf(slot.key) : IDLE
    return slot && 'file' in value && value.file && value.url
      ? { mediaType: slot.kind, url: value.url, name: value.file.name }
      : null
  }
  const uploadIdOf = (key: string) => {
    const value = fileOf(key)
    return value.status === 'ready' ? { uploadId: value.upload.uploadId } : undefined
  }
  const cardCount = templateCardMedia(template?.components ?? []).length

  return {
    slots: slots.map((slot) => ({
      ...slot,
      state: fileOf(slot.key),
      choose: (file: File) => choose(slot, file),
      clear: () => clearSlot(slot.key),
    })),
    clear,
    /** The chosen header file (template header). */
    preview: previewOf(slots.find((slot) => slot.key === 'header')),
    /** The chosen file of each carousel card, by card. */
    cardPreviews: Array.from({ length: cardCount }, (_, card) =>
      previewOf(slots.find((slot) => slot.card === card))
    ),
    /** Some file the template needs is not staged yet. */
    missing: slots.some((slot) => fileOf(slot.key).status !== 'ready'),
    /** `SendTemplateInput.headerMedia`, once staged. */
    headerMedia: uploadIdOf('header'),
    /** `SendTemplateInput.cards`: one entry per card, in order. */
    cards: cardCount
      ? (Array.from({ length: cardCount }, (_, card) => {
          const headerMedia = uploadIdOf(`card:${card}`)
          return headerMedia ? { headerMedia } : {}
        }) satisfies NonNullable<SendTemplateInput['cards']>)
      : undefined,
  }
}

export type TemplateHeaderMediaState = ReturnType<typeof useTemplateHeaderMedia>
type SlotState = TemplateHeaderMediaState['slots'][number]

/** File pickers of a template: its media header and each carousel card. */
export function TemplateHeaderMediaField({
  template,
  header,
}: {
  template: Template
  header: TemplateHeaderMediaState
}) {
  if (!header.slots.length) return null
  return (
    <div className='space-y-3'>
      {header.slots.map((slot) => (
        <FileSlotField key={slot.key} template={template} slot={slot} />
      ))}
    </div>
  )
}

/** One file picker: kind, formats, size and upload status. */
function FileSlotField({ template, slot }: { template: Template; slot: SlotState }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rule = kindRule(template, slot.kind)
  const { state } = slot
  const formats = (rule?.mimeTypes ?? [])
    .map((mime) => mime.split('/')[1]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 4)
    .join(', ')

  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id} className='text-xs font-medium'>
        {slot.label}
      </Label>
      <input
        ref={inputRef}
        id={id}
        type='file'
        className='sr-only'
        accept={rule?.mimeTypes.join(',')}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) slot.choose(file)
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
            onClick={slot.clear}
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
