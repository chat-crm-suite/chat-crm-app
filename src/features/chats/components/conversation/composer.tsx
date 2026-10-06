import { useId, useState } from 'react'
import { ImagePlus, Paperclip, Send, WifiOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function Composer({
  connected,
  onSend,
  className,
}: {
  connected: boolean
  onSend: (text: string) => void
  className?: string
}) {
  const [value, setValue] = useState('')
  const fieldId = useId()

  const send = () => {
    const text = value.trim()
    if (!text || !connected) return
    onSend(text)
    setValue('')
  }

  return (
    <form
      className={cn('bg-card flex-none border-t p-3 sm:p-4', className)}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <div className='border-input bg-background focus-within:border-ring focus-within:ring-ring/40 flex flex-col rounded-2xl border transition-[border-color,box-shadow,background-color] focus-within:ring-2'>
        <div className='flex items-end gap-1.5 p-1.5 ps-2'>
          <div className='flex items-center gap-0.5 pb-0.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden size-9 shrink-0 sm:inline-flex'
              disabled
              title='Próximamente: enviar imagen'
              aria-label='Enviar imagen (próximamente)'
            >
              <ImagePlus className='text-muted-foreground size-[18px]' />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hidden size-9 shrink-0 sm:inline-flex'
              disabled
              title='Próximamente: adjuntar archivo'
              aria-label='Adjuntar archivo (próximamente)'
            >
              <Paperclip className='text-muted-foreground size-[18px]' />
            </Button>
          </div>

          <label htmlFor={fieldId} className='sr-only'>
            Escribe un mensaje
          </label>
          <Textarea
            id={fieldId}
            rows={1}
            value={value}
            disabled={!connected}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            placeholder={connected ? 'Escribe un mensaje…' : 'Reconectando…'}
            className='caret-primary max-h-32 min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent'
          />

          <Button
            type='submit'
            size='icon'
            className='size-9 shrink-0 rounded-full'
            disabled={!connected || !value.trim()}
            aria-label='Enviar mensaje'
          >
            <Send className='size-4' />
          </Button>
        </div>
      </div>

      {!connected && (
        <p role='status' className='text-muted-foreground mt-2 flex items-center gap-1.5 text-xs'>
          <WifiOff className='text-destructive size-3.5 shrink-0' aria-hidden />
          Sin conexión con el socket. El envío se reactiva al reconectar.
        </p>
      )}
    </form>
  )
}
