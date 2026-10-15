import { Check, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { COMPANY_COPY } from '../copy'

/** IANA zones the browser knows (about 420), plus the stored one if unlisted. */
export function listTimeZones(current?: string): string[] {
  let zones: string[] = []
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = ['UTC']
  }
  return current && !zones.includes(current) ? [current, ...zones] : zones
}

type TimezoneSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Searchable list of time zones; typing "lima" is faster than scrolling. */
export function TimezoneSelect({
  value,
  onChange,
  disabled,
  ...aria
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(() => listTimeZones(value), [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className='h-9 w-full justify-between font-normal'
          {...aria}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || 'Elige una zona horaria'}
          </span>
          <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-(--radix-popover-trigger-width) p-0'
        align='start'
      >
        <Command>
          <CommandInput placeholder={COMPANY_COPY.timezoneSearch} />
          <CommandList>
            <CommandEmpty>{COMPANY_COPY.timezoneEmpty}</CommandEmpty>
            <CommandGroup>
              {zones.map((zone) => (
                <CommandItem
                  key={zone}
                  value={zone}
                  onSelect={() => {
                    onChange(zone)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'size-4',
                      zone === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {zone}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
