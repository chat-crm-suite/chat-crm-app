import { useState } from 'react'
import type { Template } from '@chat-crm/contracts'
import { Check, SearchIcon } from 'lucide-react'
import { matchesText } from '@/lib/commands'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TEMPLATE_CATEGORY_LABEL, TEMPLATE_UNSENDABLE_LABEL, copy } from '../copy'

/**
 * Selectable list of templates (radio semantics) with a local name filter.
 * Survives loading, failure and an empty channel with its own states.
 */
export function TemplateList({
  templates,
  loading,
  error,
  selectedId,
  onSelect,
  className,
}: {
  templates: Template[]
  loading?: boolean
  error?: boolean
  selectedId: string | null
  onSelect: (template: Template) => void
  className?: string
}) {
  const [search, setSearch] = useState('')
  const visible = templates.filter((template) =>
    matchesText([template.name, template.language], search)
  )

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      <div className='relative'>
        <SearchIcon
          aria-hidden
          className='text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2'
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.pickerSearch}
          aria-label={copy.pickerSearch}
          className='h-11 ps-8 sm:h-9'
        />
      </div>
      {loading ? (
        <div className='space-y-2'>
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
      ) : error ? (
        <p
          role='alert'
          className='text-muted-foreground py-6 text-center text-sm'
        >
          {copy.loadError}
        </p>
      ) : templates.length === 0 ? (
        <div className='py-6 text-center'>
          <p className='text-sm font-medium'>{copy.pickerEmpty}</p>
          <p className='text-muted-foreground text-xs'>
            {copy.pickerEmptyHint}
          </p>
        </div>
      ) : (
        <div
          role='radiogroup'
          aria-label={copy.title}
          className='min-h-0 flex-1 space-y-1 overflow-y-auto'
        >
          {visible.length === 0 && (
            <p className='text-muted-foreground py-4 text-center text-sm'>
              {copy.noMatches}
            </p>
          )}
          {visible.map((template) => {
            const selected = template.id === selectedId
            const unsendable = template.sendSupport.reason
              ? TEMPLATE_UNSENDABLE_LABEL[template.sendSupport.reason]
              : null
            return (
              <button
                key={template.id}
                type='button'
                role='radio'
                aria-checked={selected}
                disabled={!!unsendable}
                onClick={() => onSelect(template)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm',
                  'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] max-sm:min-h-11',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-accent border-transparent disabled:hover:bg-transparent'
                )}
              >
                <span className='min-w-0 flex-1'>
                  <span className='block truncate font-medium'>
                    {template.name}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {TEMPLATE_CATEGORY_LABEL[template.category]} ·{' '}
                    {template.language}
                  </span>
                  {unsendable && (
                    <span className='text-muted-foreground block text-xs'>
                      {unsendable}
                    </span>
                  )}
                </span>
                {template.variables.length > 0 && (
                  <Badge variant='outline' className='h-5 text-[10px]'>
                    {template.variables.length} var.
                  </Badge>
                )}
                {selected && (
                  <Check className='text-foreground size-4' aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
