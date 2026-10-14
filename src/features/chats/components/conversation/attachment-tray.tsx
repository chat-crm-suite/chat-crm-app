import { useEffect, useRef } from 'react'
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { FileText, Film, Headphones, Plus, SendHorizontal, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { Textarea } from '@/components/ui/textarea'
import type { ComposerAttachments, TrayItem } from '../../hooks/use-composer-attachments'
import { documentMeta, formatFileSize } from '../../lib/attachment-meta'

const KIND_ICONS = { video: Film, audio: Headphones, document: FileText, image: FileText }

function ItemPreview({ item }: { item: TrayItem }) {
  if (item.kind === 'image' && item.previewUrl) {
    return (
      <img
        src={item.previewUrl}
        alt={item.file.name}
        className='max-h-full max-w-full rounded-lg object-contain shadow-sm'
      />
    )
  }
  if (item.kind === 'video' && item.previewUrl) {
    return (
      <video
        src={item.previewUrl}
        controls
        playsInline
        preload='metadata'
        aria-label={item.file.name}
        className='max-h-full max-w-full rounded-lg bg-black shadow-sm'
      />
    )
  }

  const Icon = KIND_ICONS[item.kind]
  return (
    <div className='flex flex-col items-center gap-3 text-center'>
      <span className='bg-muted grid size-20 place-items-center rounded-2xl'>
        <Icon aria-hidden className='text-muted-foreground size-9' />
      </span>
      <p className='max-w-72 truncate text-sm font-medium'>{item.file.name}</p>
      <p className='text-muted-foreground text-xs'>
        {documentMeta({ mimeType: item.file.type, sizeBytes: item.file.size, filename: item.file.name }) ??
          formatFileSize(item.file.size)}
      </p>
    </div>
  )
}

function Thumbnail({ item }: { item: TrayItem }) {
  if (item.previewUrl && item.kind === 'image') {
    return <img src={item.previewUrl} alt='' className='size-full object-cover' />
  }
  const Icon = KIND_ICONS[item.kind]
  return <Icon aria-hidden className='text-muted-foreground size-5' />
}

/**
 * Send tray, like WhatsApp's media preview: big preview of the selected file,
 * a caption per file, and a strip of thumbnails the agent reorders by drag
 * (or keyboard) before sending everything in that order.
 */
export function AttachmentTray({
  attachments,
  onSend,
  onAddMore,
  disabled,
}: {
  attachments: ComposerAttachments
  onSend: () => void
  onAddMore: () => void
  disabled: boolean
}) {
  const { items, selected } = attachments
  // A click selects, a short drag (or a press on touch) reorders; on the
  // keyboard Enter selects and Space picks the thumbnail up to move it.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    })
  )
  const captionRef = useRef<HTMLTextAreaElement>(null)
  const canCaption = selected?.kind !== 'audio'

  // Typing goes to the caption of whichever file is selected.
  useEffect(() => {
    captionRef.current?.focus()
  }, [selected?.id])

  if (!selected) return null

  return (
    <section
      aria-label='Archivos para enviar'
      className='bg-card flex max-h-[min(36rem,70dvh)] flex-col overflow-hidden rounded-2xl border shadow-sm'
      onKeyDown={(event) => {
        if (event.key === 'Escape') attachments.clear()
      }}
    >
      <header className='flex items-center gap-2 border-b px-2 py-1.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={attachments.clear}
          aria-label='Descartar archivos'
          className='size-9 max-sm:size-11'
        >
          <X className='size-4' />
        </Button>
        <p className='min-w-0 flex-1 truncate text-sm font-medium'>{selected.file.name}</p>
        <span className='text-muted-foreground text-xs tabular-nums'>
          {items.length > 1 && `${items.indexOf(selected) + 1} de ${items.length} · `}
          {formatFileSize(selected.file.size)}
        </span>
      </header>

      <div className='bg-muted/30 grid min-h-40 flex-1 place-items-center overflow-hidden p-4'>
        <ItemPreview item={selected} />
      </div>

      <div className='flex flex-col gap-2 border-t p-2'>
        {canCaption && (
          <Textarea
            ref={captionRef}
            rows={1}
            value={selected.caption}
            onChange={(event) => attachments.setCaption(selected.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (!disabled) onSend()
              }
            }}
            placeholder='Añade un comentario…'
            aria-label={`Comentario para ${selected.file.name}`}
            className='max-h-24 min-h-9 resize-none text-sm'
          />
        )}

        <div className='flex items-center gap-2'>
          <Sortable
            value={items}
            onValueChange={attachments.reorder}
            getItemValue={(item) => item.id}
            orientation='horizontal'
            sensors={sensors}
          >
            <SortableContent
              aria-label='Orden de envío'
              className='flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-1'
            >
              {items.map((item, index) => (
                <SortableItem key={item.id} value={item.id} className='group/thumb relative shrink-0'>
                  <SortableItemHandle asChild>
                    <button
                      type='button'
                      onClick={() => attachments.select(item.id)}
                      aria-label={`Archivo ${index + 1} de ${items.length}: ${item.file.name}`}
                      aria-pressed={item.id === selected.id}
                      className={cn(
                        'bg-muted grid size-12 place-items-center overflow-hidden rounded-lg border-2 border-transparent transition-colors focus-visible:outline-none max-sm:size-14',
                        'focus-visible:ring-ring focus-visible:ring-2',
                        item.id === selected.id && 'border-primary'
                      )}
                    >
                      <Thumbnail item={item} />
                    </button>
                  </SortableItemHandle>
                  <button
                    type='button'
                    onClick={() => attachments.remove(item.id)}
                    aria-label={`Quitar ${item.file.name}`}
                    className={cn(
                      'bg-foreground text-background absolute -end-1 -top-1 grid size-5 place-items-center rounded-full shadow transition-opacity',
                      'opacity-0 group-hover/thumb:opacity-100 focus-visible:opacity-100 max-sm:opacity-100',
                      item.id === selected.id && 'opacity-100'
                    )}
                  >
                    <X className='size-3' />
                  </button>
                </SortableItem>
              ))}
              <button
                type='button'
                onClick={onAddMore}
                aria-label='Añadir más archivos'
                className='text-muted-foreground hover:bg-muted focus-visible:ring-ring grid size-12 shrink-0 place-items-center rounded-lg border-2 border-dashed transition-colors focus-visible:ring-2 focus-visible:outline-none max-sm:size-14'
              >
                <Plus className='size-5' />
              </button>
            </SortableContent>
          </Sortable>

          <Button
            type='button'
            size='icon'
            onClick={onSend}
            disabled={disabled}
            aria-label={items.length > 1 ? `Enviar ${items.length} archivos` : 'Enviar archivo'}
            title='Enviar'
            className='relative size-11 shrink-0 rounded-full'
          >
            <SendHorizontal className='size-5' />
            {items.length > 1 && (
              <span className='bg-background text-foreground absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums shadow'>
                {items.length}
              </span>
            )}
          </Button>
        </div>
        <p className='text-muted-foreground hidden text-[11px] sm:block'>
          <Kbd>Enter</Kbd> envía · arrastra las miniaturas para ordenar · <Kbd>Esc</Kbd> descarta
        </p>
      </div>
    </section>
  )
}
