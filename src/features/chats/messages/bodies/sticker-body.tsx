import { cn } from '@/lib/utils'
import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaSource } from '../media-source'
import type { MessageBodyProps } from '../message-kind'
import { useStickerPlayback } from '../use-sticker-playback'

/** Stickers float without a frame, like in WhatsApp. */
export function StickerBody({ view, message }: MessageBodyProps<'sticker'>) {
  const source = mediaSource(message, view.media)

  if (source.state !== 'ready') {
    return <MediaPlaceholder source={source} label='Sticker' className='mt-1' />
  }

  return (
    <span className='relative mt-1 block size-36'>
      <StickerImage src={source.src} />
      {source.uploading && (
        <span className='absolute inset-0 overflow-hidden rounded-xl'>
          <UploadProgress progress={source.progress} />
        </span>
      )}
    </span>
  )
}

function StickerImage({ src }: { src: string }) {
  const { state, playUrl, play, containerRef, canvasRef, imageRef } =
    useStickerPlayback(src)
  const image = 'size-full object-contain drop-shadow-sm'

  if (state === 'probing') {
    return <span role='img' aria-label='Cargando sticker' aria-busy className='block size-full' />
  }
  if (state === 'still') {
    return (
      <img src={src} alt='Sticker' loading='lazy' decoding='async' className={image} />
    )
  }

  return (
    <span
      ref={containerRef}
      role='img'
      aria-label='Sticker animado'
      onPointerEnter={play}
      onClick={play}
      className='relative block size-full cursor-pointer'
    >
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        aria-hidden
        className={cn(image, playUrl && 'invisible')}
      />
      {playUrl && (
        <img
          ref={imageRef}
          src={playUrl}
          alt=''
          className={cn(image, 'absolute inset-0')}
        />
      )}
    </span>
  )
}
