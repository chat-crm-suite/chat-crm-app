import { useState } from 'react'

import { ImageLightbox } from '../../components/conversation/image-lightbox'
import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaFrameStyle, mediaSource } from '../media-source'
import { MediaMetaOverlay } from '../message-meta'
import type { MessageBodyProps } from '../message-kind'
import { Caption } from './text-body'

export function ImageBody({
  view,
  message,
  isMine,
  senderName,
}: MessageBodyProps<'image'>) {
  const [open, setOpen] = useState(false)
  const source = mediaSource(message, view.media)
  const alt = view.caption ?? 'Imagen'

  if (source.state !== 'ready') {
    return (
      <div className='mt-1'>
        <MediaPlaceholder source={source} label='Imagen' />
        {view.caption && <Caption text={view.caption} />}
      </div>
    )
  }

  return (
    <div className='mt-1 w-72 max-w-full'>
      <button
        type='button'
        onClick={() => setOpen(true)}
        disabled={source.uploading}
        aria-label='Ampliar imagen'
        className='group/image focus-visible:ring-ring relative block w-[min(18rem,100%)] cursor-zoom-in overflow-hidden rounded-xl border p-0 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default'
        style={mediaFrameStyle(view.media.width, view.media.height)}
      >
        <img
          src={source.src}
          alt={alt}
          loading='lazy'
          decoding='async'
          className='bg-muted block size-full max-h-[26rem] object-cover transition duration-200 motion-safe:group-hover/image:brightness-105 motion-safe:group-focus-visible/image:brightness-105'
        />
        {source.uploading && <UploadProgress progress={source.progress} />}
        {!view.caption && !source.uploading && (
          <MediaMetaOverlay message={message} isMine={isMine} />
        )}
      </button>
      {view.caption && <Caption text={view.caption} />}
      <ImageLightbox
        open={open}
        onOpenChange={setOpen}
        src={source.src}
        alt={alt}
        caption={view.caption ?? undefined}
        senderName={senderName}
        timestamp={new Date(message.timestamp)}
      />
    </div>
  )
}
