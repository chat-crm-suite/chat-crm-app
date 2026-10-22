import { LayoutTemplate } from 'lucide-react'
import { TemplateCard } from '@/features/templates/components/template-card'
import { TemplateCarousel } from '@/features/templates/components/template-carousel'
import { copy } from '@/features/templates/copy'
import { linkify } from '../../linkify'
import type { MessageBodyProps } from '../../message-kind'
import { TemplateHeaderMedia } from './template-header'

/**
 * A sent template in the thread, channel-agnostic: the snapshot the API
 * stored at send time (values already filled), as a card that keeps the
 * flat row layout, with carousel cards in a row below it. The template name
 * labels it as a template send.
 */
export function TemplateBody({ view, ...row }: MessageBodyProps<'template'>) {
  const { header } = view

  return (
    <div className='flex flex-col gap-1'>
      <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
        <LayoutTemplate aria-hidden className='size-3.5' />
        Plantilla · <span className='font-mono'>{view.name}</span>
      </span>
      <TemplateCard
        variant='inline'
        media={
          header?.kind === 'media' ? (
            <div className='px-2 pt-1 [&>div]:w-full'>
              <TemplateHeaderMedia header={header} {...row} />
            </div>
          ) : undefined
        }
        title={header?.kind === 'text' ? header.text : undefined}
        body={view.body ? linkify(view.body) : undefined}
        footer={view.footer}
        buttons={view.buttons}
        carousel={
          view.cards.length ? (
            <TemplateCarousel
              label={copy.carouselLabel}
              cards={view.cards.map((card) => ({
                media: card.header ? (
                  <div className='px-2 pt-1 [&>div]:w-full'>
                    <TemplateHeaderMedia header={card.header} {...row} />
                  </div>
                ) : undefined,
                body: card.body ? linkify(card.body) : undefined,
                buttons: card.buttons,
              }))}
            />
          ) : undefined
        }
      />
    </div>
  )
}
