import { Check } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'
import { FormSection } from '@/components/form-kit'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { APPEARANCE_COPY } from '../copy'
import { TEXT_SIZES, useTextSize, type TextSize } from '../lib/text-size'

type ThemeChoice = 'light' | 'dark' | 'system'
const THEMES: ThemeChoice[] = ['light', 'dark', 'system']

const SWATCH = {
  light: {
    page: 'oklch(0.9911 0 0)',
    panel: 'oklch(0.9461 0 0)',
    line: 'oklch(0.86 0 0)',
  },
  dark: {
    page: 'oklch(0.13 0 0)',
    panel: 'oklch(0.2603 0 0)',
    line: 'oklch(0.4 0 0)',
  },
} as const

const PRIMARY = 'oklch(0.8348 0.1302 160.908)'

/** A miniature of the app (sidebar, one mint action, two lines of text). */
function Miniature({ mode }: { mode: 'light' | 'dark' }) {
  const colors = SWATCH[mode]
  return (
    <span
      aria-hidden
      className='flex h-full w-full gap-1.5 p-2'
      style={{ backgroundColor: colors.page }}
    >
      <span
        className='h-full w-4 rounded-sm'
        style={{ backgroundColor: colors.panel }}
      />
      <span className='flex flex-1 flex-col gap-1.5 pt-0.5'>
        <span
          className='h-1.5 w-3/4 rounded-full'
          style={{ backgroundColor: colors.line }}
        />
        <span
          className='h-1.5 w-1/2 rounded-full'
          style={{ backgroundColor: colors.line }}
        />
        <span
          className='mt-auto h-3 w-8 rounded-sm'
          style={{ backgroundColor: PRIMARY }}
        />
      </span>
    </span>
  )
}

function ThemePreview({ choice }: { choice: ThemeChoice }) {
  if (choice !== 'system') return <Miniature mode={choice} />

  // "Igual que el sistema": the same window, half light and half dark.
  return (
    <span aria-hidden className='relative block h-full w-full'>
      <span className='absolute inset-0'>
        <Miniature mode='light' />
      </span>
      <span
        className='absolute inset-0'
        style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 100%, 35% 100%)' }}
      >
        <Miniature mode='dark' />
      </span>
    </span>
  )
}

const TILE =
  'group has-[:focus-visible]:ring-ring/60 relative flex cursor-pointer flex-col gap-2 rounded-xl border p-2 transition-colors has-[:focus-visible]:ring-[3px] has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-foreground hover:bg-muted/40'

/** Check mark on the chosen tile: the border alone is too faint to carry it. */
function Chosen() {
  return (
    <span
      aria-hidden
      className='bg-primary text-primary-foreground absolute end-2 top-2 z-10 hidden size-5 items-center justify-center rounded-full group-has-[[data-state=checked]]:flex'
    >
      <Check className='size-3.5' />
    </span>
  )
}

const SAMPLE_PX: Record<TextSize, string> = {
  normal: 'text-sm',
  large: 'text-base',
  larger: 'text-xl',
}

/** Theme and text size: both apply the moment they are picked. */
export function AppearanceForm() {
  const { theme, setTheme } = useTheme()
  const { size, setSize } = useTextSize()

  return (
    <div className='space-y-10'>
      <FormSection
        title={APPEARANCE_COPY.themeSection}
        description={APPEARANCE_COPY.themeHint}
      >
        <RadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemeChoice)}
          aria-label={APPEARANCE_COPY.themeSection}
          className='grid grid-cols-3 gap-3'
        >
          {THEMES.map((choice) => (
            <label key={choice} className={TILE}>
              <RadioGroupItem value={choice} className='sr-only' />
              <Chosen />
              <span className='border-border/60 block h-20 overflow-hidden rounded-md border'>
                <ThemePreview choice={choice} />
              </span>
              <span className='px-1 pb-0.5 text-center text-[13px] font-medium'>
                {APPEARANCE_COPY.themes[choice]}
              </span>
            </label>
          ))}
        </RadioGroup>
      </FormSection>

      <FormSection
        title={APPEARANCE_COPY.textSection}
        description={APPEARANCE_COPY.textHint}
      >
        <RadioGroup
          value={size}
          onValueChange={(value) => setSize(value as TextSize)}
          aria-label={APPEARANCE_COPY.textSection}
          className='grid grid-cols-3 gap-3'
        >
          {TEXT_SIZES.map((choice) => (
            <label key={choice} className={cn(TILE, 'items-center py-3')}>
              <RadioGroupItem value={choice} className='sr-only' />
              <Chosen />
              <span aria-hidden className='flex h-8 items-end'>
                <span className={cn('font-medium leading-none', SAMPLE_PX[choice])}>
                  Aa
                </span>
              </span>
              <span className='text-[13px] font-medium'>
                {APPEARANCE_COPY.textSizes[choice]}
              </span>
            </label>
          ))}
        </RadioGroup>
      </FormSection>
    </div>
  )
}
