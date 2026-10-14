import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaSource } from '../media-source'
import type { MessageBodyProps } from '../message-kind'

/** Stickers float without a frame, like in WhatsApp. */
export function StickerBody({ view, message }: MessageBodyProps<'sticker'>) {
  const source = mediaSource(message, view.media)

  if (source.state !== 'ready') {
    return <MediaPlaceholder source={source} label='Sticker' className='mt-1' />
  }

  return (
    <span className='relative mt-1 block size-36'>
      <img
        src={source.src}
        alt='Sticker'
        loading='lazy'
        decoding='async'
        className='size-full object-contain drop-shadow-sm'
      />
      {source.uploading && (
        <span className='absolute inset-0 overflow-hidden rounded-xl'>
          <UploadProgress progress={source.progress} />
        </span>
      )}
    </span>
  )
}
