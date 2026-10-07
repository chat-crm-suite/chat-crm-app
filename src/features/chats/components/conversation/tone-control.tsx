import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { ChatSentiment } from '../../types/chat.domain'
import { TONE_META } from './tone-meta'
import { useToneMode, type ToneMode } from './tone-mode'
import { ToneMeter, ToneSummary } from './tone-summary'

/**
 * Phones get the detail as a bottom sheet: a 320px popover does not fit the
 * 375px header comfortably. 639px matches Tailwind's `sm` (640px) boundary.
 */
export const TONE_SHEET_MEDIA_QUERY = '(max-width: 639px)'

const MODE_LABEL: Record<ToneMode, string> = {
  full: 'Completo',
  mini: 'Mini',
  off: 'Oculto',
}

/**
 * Detail body shared by the popover (desktop) and the sheet (phones): mix,
 * percentages, total and the mode selector. The mode options grow to a 44px
 * touch target on small screens.
 */
function ToneDetail({
  sentiment,
  mode,
  onModeChange,
}: {
  sentiment: ChatSentiment
  mode: ToneMode
  onModeChange: (mode: ToneMode) => void
}) {
  return (
    <>
      <p className='text-muted-foreground mb-3 text-xs font-medium'>
        Análisis de sentimiento
      </p>

      <ToneSummary sentiment={sentiment} />

      <div className='mt-3 flex items-center justify-between gap-3 border-t pt-3'>
        <span className='text-muted-foreground text-xs font-medium'>
          Mostrar tono
        </span>
        <RadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ToneMode)}
          aria-label='Modo del tono'
          className='flex gap-3'
        >
          {(Object.keys(MODE_LABEL) as ToneMode[]).map((option) => {
            const id = `tone-mode-${option}`
            return (
              <div
                key={option}
                className='flex items-center gap-1.5 max-sm:min-h-11'
              >
                <RadioGroupItem value={option} id={id} />
                <Label
                  htmlFor={id}
                  className='flex items-center text-xs font-normal max-sm:min-h-11 max-sm:pe-2'
                >
                  {MODE_LABEL[option]}
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </div>
    </>
  )
}

/** Header badge: face, mix and detail popover/sheet. Hidden in off mode. */
export function ToneControl({
  sentiment,
  className,
}: {
  sentiment?: ChatSentiment
  className?: string
}) {
  const [mode, setMode] = useToneMode()
  const isCompact = useMediaQuery(TONE_SHEET_MEDIA_QUERY)

  if (!sentiment || mode === 'off') return null

  const meta = TONE_META[sentiment.dominant]
  const Face = meta.icon

  const trigger = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn(
        'h-11 min-w-11 gap-1.5 rounded-full px-3 sm:h-8 sm:min-w-0 sm:px-2.5',
        className
      )}
    >
      <Face
        className='size-4 shrink-0'
        style={{ color: meta.color }}
        aria-hidden
      />
      {mode === 'full' && (
        <span className='max-w-16 truncate text-xs font-medium' aria-hidden>
          {meta.label}
        </span>
      )}
      <ToneMeter sentiment={sentiment} className='hidden sm:flex' />
      <span className='sr-only'>Tono {meta.label}. Ver detalle</span>
    </Button>
  )

  const detail = (
    <ToneDetail sentiment={sentiment} mode={mode} onModeChange={setMode} />
  )

  if (isCompact) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side='bottom'
          className='max-h-[85dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
        >
          <SheetTitle className='sr-only'>Detalle del tono</SheetTitle>
          {detail}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align='end' className='w-80'>
        {detail}
      </PopoverContent>
    </Popover>
  )
}
