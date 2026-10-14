import { useRef, useState } from 'react'
import { ImageUp, Sticker } from 'lucide-react'
import type { ChannelCapabilities } from '@chat-crm/contracts'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { InputGroupButton } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import type { OutgoingDraft } from '../../lib/outgoing-draft'
import type { RecentSticker } from '../../lib/recent-stickers'
import { canEncodeWebp, makeSticker } from '../../lib/sticker-maker'

/**
 * Stickers, the WhatsApp way: re-send one already in the conversation (no
 * upload) or make one from any picture, converted in the browser.
 */
export function StickerPicker({
  recent,
  rules,
  disabled,
  onSend,
}: {
  recent: RecentSticker[]
  rules: ChannelCapabilities['sticker']
  disabled: boolean
  onSend: (draft: OutgoingDraft) => void
}) {
  const [open, setOpen] = useState(false)
  const [making, setMaking] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const [canMake] = useState(canEncodeWebp)

  if (!rules) return null

  const create = async (file: File) => {
    setMaking(true)
    try {
      onSend({ type: 'sticker', file: await makeSticker(file, rules) })
      setOpen(false)
    } catch (error: unknown) {
      toast.error('No se pudo crear el sticker', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setMaking(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <InputGroupButton
          size='icon-sm'
          disabled={disabled}
          aria-label='Stickers'
          className='rounded-full max-sm:size-11'
        >
          <Sticker className='size-[18px]' />
        </InputGroupButton>
      </PopoverTrigger>
      <PopoverContent align='start' side='top' className='w-80 p-3'>
        <p className='mb-2 text-sm font-medium'>Stickers de esta conversación</p>
        {recent.length ? (
          <ul
            aria-label='Stickers de esta conversación'
            className='grid max-h-56 grid-cols-4 gap-1 overflow-y-auto'
          >
            {recent.map((sticker, index) => (
              <li key={sticker.attachmentId}>
                <button
                  type='button'
                  aria-label={`Enviar sticker ${index + 1}`}
                  onClick={() => {
                    onSend({ type: 'sticker', attachmentId: sticker.attachmentId, previewUrl: sticker.url })
                    setOpen(false)
                  }}
                  className='hover:bg-muted focus-visible:ring-ring aspect-square w-full rounded-lg p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none'
                >
                  <img src={sticker.url} alt='' loading='lazy' className='size-full object-contain' />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty className='border-0 p-4'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Sticker />
              </EmptyMedia>
              <EmptyTitle className='text-sm'>Aún no hay stickers</EmptyTitle>
              <EmptyDescription className='text-xs'>
                Los que envíe el cliente aparecerán aquí para responder con ellos.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {canMake && (
          <>
            <input
              ref={input}
              type='file'
              hidden
              accept='image/png,image/jpeg,image/webp'
              data-testid='sticker-input'
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void create(file)
              }}
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={making}
              onClick={() => input.current?.click()}
              className='mt-3 w-full'
            >
              {making ? <Spinner /> : <ImageUp />}
              Crear sticker desde una imagen
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
