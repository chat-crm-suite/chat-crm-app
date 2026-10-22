import { normalizeSearchText } from '@/lib/commands'
import { cn } from '@/lib/utils'
import { QUICK_REPLIES, copy } from '../../copy'

export type QuickReply = (typeof QUICK_REPLIES)[number]

/**
 * Slash query of the composer: the text after a leading "/" while it is a
 * single word-ish line ("/sal" -> "sal"); `null` when the field is not
 * asking for the quick-reply menu.
 */
export function slashQuery(value: string): string | null {
  if (!value.startsWith('/')) return null
  const query = value.slice(1)
  return /\n/.test(query) || query.length > 40 ? null : query
}

/** Quick replies whose label or draft contains every typed word. */
export function filterQuickReplies(query: string): QuickReply[] {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...QUICK_REPLIES]
  return QUICK_REPLIES.filter((reply) => {
    const haystack = normalizeSearchText(`${reply.label} ${reply.draft}`)
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * "/" menu of the composer: replaces the old chip row (no dead space when
 * unused). Floats above the field, keyboard-driven by the composer (arrows,
 * Enter/Tab to insert, Escape to close); a click inserts too.
 */
export function SlashMenu({
  id,
  replies,
  activeIndex,
  onPick,
  onHover,
}: {
  id: string
  replies: QuickReply[]
  activeIndex: number
  onPick: (reply: QuickReply) => void
  onHover: (index: number) => void
}) {
  return (
    <div className='bg-popover text-popover-foreground absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border shadow-md'>
      <p className='text-muted-foreground border-b px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase'>
        {copy.quickReplies}
      </p>
      {replies.length === 0 ? (
        <p className='text-muted-foreground px-3 py-3 text-sm'>
          {copy.noQuickReplies}
        </p>
      ) : (
        <ul
          id={id}
          role='listbox'
          aria-label={copy.quickReplies}
          className='max-h-60 overflow-y-auto p-1'
        >
          {replies.map((reply, index) => (
            <li
              key={reply.label}
              id={`${id}-${index}`}
              role='option'
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                // Keep the textarea focused: the pick happens on mouse down.
                event.preventDefault()
                onPick(reply)
              }}
              onMouseEnter={() => onHover(index)}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-sm max-sm:min-h-11',
                index === activeIndex && 'bg-accent text-accent-foreground'
              )}
            >
              <span className='font-medium'>/{reply.label.toLowerCase()}</span>
              <span className='text-muted-foreground line-clamp-1 text-xs'>
                {reply.draft}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
