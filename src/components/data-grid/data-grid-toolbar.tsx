import { Check, PlusCircle, Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type FacetOption = {
  value: string
  label: string
  icon?: ReactNode
  /** Rows matching this option (from the server counts), when known. */
  count?: number
}

type FacetFilterProps = {
  title: string
  options: FacetOption[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Use for single-choice facets. */
  single?: boolean
}

/** Controlled multi-select filter; state lives in the URL, not in the table. */
export function FacetFilter({
  title,
  options,
  selected,
  onChange,
  single,
}: FacetFilterProps) {
  const chosen = new Set(selected)

  const toggle = (value: string) => {
    if (single) return onChange(chosen.has(value) ? [] : [value])
    const next = new Set(chosen)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-9'>
          <PlusCircle className='size-4' />
          {title}
          {chosen.size > 0 ? (
            <Badge variant='secondary' className='ms-1 rounded px-1.5 font-normal'>
              {chosen.size > 2
                ? `${chosen.size} elegidos`
                : options
                    .filter((o) => chosen.has(o.value))
                    .map((o) => o.label)
                    .join(', ')}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-56 p-0' align='start'>
        <Command>
          {options.length > 6 ? <CommandInput placeholder={title} /> : null}
          <CommandList>
            <CommandEmpty>Sin opciones.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isOn = chosen.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    <span
                      className={cn(
                        'border-primary flex size-4 items-center justify-center rounded-sm border',
                        isOn
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className='size-3' />
                    </span>
                    {option.icon}
                    <span className='truncate'>{option.label}</span>
                    {option.count !== undefined ? (
                      <span className='text-muted-foreground ms-auto text-xs tabular-nums'>
                        {option.count}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {chosen.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className='justify-center text-center'
                  >
                    Quitar selección
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type ActiveFilter = { key: string; label: string; onRemove: () => void }

type ToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Milliseconds before typing reaches `onSearchChange`. */
  debounceMs?: number
  /** Facet filters, rendered next to the search field. */
  filters?: ReactNode
  /** Removable chips for every filter currently applied. */
  activeFilters?: ActiveFilter[]
  onReset?: () => void
  /** "128 clientes": lets people know how much the filters cut. */
  summary?: ReactNode
  /** Right side: primary actions (add, import, view options). */
  trailing?: ReactNode
}

/**
 * One search box, facet filters, removable chips for what is applied, and a
 * result summary. Typing is debounced locally so the URL/query only changes
 * when the person pauses; `/` focuses the search from anywhere on the page.
 */
export function DataGridToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  debounceMs = 350,
  filters,
  activeFilters = [],
  onReset,
  summary,
  trailing,
}: ToolbarProps) {
  const [draft, setDraft] = useState(search)
  const input = useRef<HTMLInputElement>(null)

  // External changes (reset, back button) win over the draft.
  useEffect(() => setDraft(search), [search])

  useEffect(() => {
    if (draft === search) return
    const id = window.setTimeout(() => onSearchChange(draft), debounceMs)
    return () => window.clearTimeout(id)
  }, [draft, search, onSearchChange, debounceMs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = target.closest('input,textarea,select,[contenteditable]')
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative w-full sm:w-72'>
          <Search
            aria-hidden
            className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2'
          />
          <input
            ref={input}
            type='search'
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className='border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border ps-9 pe-9 text-sm focus-visible:ring-2 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden'
          />
          {draft ? (
            <button
              type='button'
              aria-label='Borrar búsqueda'
              onClick={() => {
                setDraft('')
                onSearchChange('')
                input.current?.focus()
              }}
              className='text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2 rounded p-1'
            >
              <X className='size-3.5' />
            </button>
          ) : (
            <Kbd className='absolute end-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex'>
              /
            </Kbd>
          )}
        </div>
        {filters}
        <div className='ms-auto flex items-center gap-2'>{trailing}</div>
      </div>

      {activeFilters.length > 0 || summary ? (
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          {summary ? (
            <span className='text-muted-foreground me-1 tabular-nums' aria-live='polite'>
              {summary}
            </span>
          ) : null}
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type='button'
              onClick={filter.onRemove}
              aria-label={`Quitar filtro ${filter.label}`}
              className='bg-muted hover:bg-muted/70 focus-visible:ring-ring inline-flex h-6 items-center gap-1 rounded-full ps-2.5 pe-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none'
            >
              {filter.label}
              <X className='size-3' />
            </button>
          ))}
          {activeFilters.length > 1 && onReset ? (
            <button
              type='button'
              onClick={onReset}
              className='text-muted-foreground hover:text-foreground text-xs underline underline-offset-2'
            >
              Quitar todos
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
