import { useState } from 'react'
import type { Tag } from '@chat-crm/contracts'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
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
import { copy } from '../copy'
import {
  customerErrorMessage,
  useCreateTag,
  useTags,
} from '../customers-data'
import { ColorDot } from './customers-columns'

type Props = {
  tags: Tag[]
  /** Called with the whole new set (the API replaces it, it does not patch). */
  onChange: (tags: Tag[]) => void
  disabled?: boolean
}

/**
 * Tags of one customer. Removing is one click on the chip; adding opens a
 * search over the company's tags, and typing a name that does not exist offers
 * to create it, so Enter on a new word is all it takes.
 */
export function TagEditor({ tags, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const catalog = useTags()
  const createTag = useCreateTag()

  const name = typed.trim()
  const chosen = new Set(tags.map((tag) => tag.id))
  const available = (catalog.data ?? []).filter(
    (tag) =>
      !chosen.has(tag.id) &&
      tag.name.toLowerCase().includes(name.toLowerCase())
  )
  const exact = (catalog.data ?? []).find(
    (tag) => tag.name.toLowerCase() === name.toLowerCase()
  )
  const canCreate = name.length > 0 && !exact

  const close = () => {
    setOpen(false)
    setTyped('')
  }

  const add = (tag: Tag) => {
    onChange([...tags, tag])
    close()
  }

  const create = async () => {
    try {
      add(await createTag.mutateAsync(name))
    } catch (error) {
      toast.error(customerErrorMessage(error))
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {tags.length === 0 ? (
        <span className='text-muted-foreground text-sm'>{copy.detail.noTags}</span>
      ) : null}
      {tags.map((tag) => (
        <span
          key={tag.id}
          className='text-foreground/80 inline-flex h-6 items-center gap-1.5 rounded-md border ps-2 pe-0.5 text-xs font-medium'
        >
          <ColorDot color={tag.color} />
          {tag.name}
          <button
            type='button'
            disabled={disabled}
            aria-label={copy.detail.removeTag(tag.name)}
            onClick={() => onChange(tags.filter((t) => t.id !== tag.id))}
            className='text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring rounded p-0.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50'
          >
            <X aria-hidden className='size-3' />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={disabled}
            className='text-muted-foreground h-6 gap-1 px-2 text-xs'
          >
            <Plus aria-hidden className='size-3' />
            {copy.detail.addTag}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-64 p-0' align='start'>
          <Command shouldFilter={false}>
            <CommandInput
              value={typed}
              onValueChange={setTyped}
              placeholder={copy.detail.tagPlaceholder}
            />
            <CommandList>
              <CommandEmpty>
                {catalog.isPending ? 'Cargando…' : copy.detail.noTags}
              </CommandEmpty>
              <CommandGroup>
                {canCreate ? (
                  <CommandItem value={`create-${name}`} onSelect={() => void create()}>
                    <Plus aria-hidden />
                    {copy.detail.createTag(name)}
                  </CommandItem>
                ) : null}
                {available.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.id}
                    onSelect={() => add(tag)}
                  >
                    <ColorDot color={tag.color} />
                    <span className='truncate'>{tag.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

