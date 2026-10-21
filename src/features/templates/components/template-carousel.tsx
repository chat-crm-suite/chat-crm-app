import type { ReactNode } from 'react'
import type { TemplateButton } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import { TemplateCard } from './template-card'

/** One carousel card, already rendered by its caller (preview or thread). */
export interface TemplateCarouselCard {
  media?: ReactNode
  body?: ReactNode
  buttons: readonly TemplateButton[]
}

/**
 * The cards of a carousel template, channel-agnostic: a row the customer
 * swipes, here a horizontal scroller of compact cards. Shared by the picker
 * preview and the sent message in the thread.
 */
export function TemplateCarousel({
  cards,
  label,
  className,
}: {
  cards: readonly TemplateCarouselCard[]
  /** Accessible name of the row (e.g. "Tarjetas del carrusel"). */
  label: string
  className?: string
}) {
  if (!cards.length) return null
  return (
    <ul
      aria-label={label}
      className={cn(
        'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]',
        className
      )}
    >
      {cards.map((card, index) => (
        <li key={index} className='shrink-0 snap-start'>
          <TemplateCard
            variant='inline'
            className='w-56'
            media={card.media}
            body={card.body}
            buttons={card.buttons}
          />
        </li>
      ))}
    </ul>
  )
}
