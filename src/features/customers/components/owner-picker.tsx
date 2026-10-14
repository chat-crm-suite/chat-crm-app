import { useEffect, useState } from 'react'
import type { CompanyMemberResponse } from '@chat-crm/contracts'
import { Check, ChevronDown } from 'lucide-react'
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
import { MonogramAvatar } from '@/components/data-grid'
import { copy } from '../copy'
import { useOwnerCandidates } from '../customers-data'

const memberLabel = (member: CompanyMemberResponse) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') ||
  member.username

type Props = {
  id?: string
  /** Member id currently chosen. */
  value?: string | null
  /** Name to show for `value` while the candidate list may not contain it. */
  valueLabel?: string | null
  placeholder?: string
  /** `null` means "Sin responsable" (only when `noneLabel` is given). */
  onChange: (memberId: string | null) => void
  /** Offers a first option that clears the owner. */
  noneLabel?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Searchable member picker (server-side `GET /company-members?q=`). With
 * `noneLabel` it also offers clearing the owner.
 */
export function OwnerPicker({
  id,
  value,
  valueLabel,
  placeholder = copy.detail.ownerPlaceholder,
  onChange,
  noneLabel,
  disabled,
  ...aria
}: Props) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [query, setQuery] = useState('')

  // Debounce the request, not the keystrokes.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(typed.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [typed])

  const members = useOwnerCandidates(query, open)
  const chosen = members.data?.find((member) => member.id === value)
  const label = chosen ? memberLabel(chosen) : valueLabel

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !label && 'text-muted-foreground'
          )}
          {...aria}
        >
          <span className='truncate'>{label || placeholder}</span>
          <ChevronDown aria-hidden className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[var(--radix-popover-trigger-width)] min-w-60 p-0'
        align='start'
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={typed}
            onValueChange={setTyped}
            placeholder={copy.detail.searchOwner}
          />
          <CommandList>
            <CommandEmpty>
              {members.isPending ? 'Buscando…' : copy.detail.noMembers}
            </CommandEmpty>
            <CommandGroup>
              {noneLabel ? (
                <CommandItem
                  value='none'
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  <span className='text-muted-foreground'>{noneLabel}</span>
                  <Check
                    aria-hidden
                    className={cn('ms-auto size-4', value ? 'opacity-0' : 'opacity-100')}
                  />
                </CommandItem>
              ) : null}
              {(members.data ?? []).map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.id}
                  onSelect={() => {
                    onChange(member.id)
                    setOpen(false)
                  }}
                >
                  <MonogramAvatar
                    size='sm'
                    name={memberLabel(member)}
                    tintKey={member.id}
                  />
                  <span className='truncate'>{memberLabel(member)}</span>
                  <Check
                    aria-hidden
                    className={cn(
                      'ms-auto size-4',
                      member.id === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
