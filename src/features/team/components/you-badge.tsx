import { copy } from '../copy'

/** Marker for the signed-in member's own row. */
export function YouBadge() {
  return (
    <span className='bg-primary text-primary-foreground rounded px-1.5 text-[11px] leading-4 font-medium'>
      {copy.you}
    </span>
  )
}
