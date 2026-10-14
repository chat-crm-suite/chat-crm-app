import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaFrameStyle, mediaSource } from '../media-source'
import type { MessageBodyProps } from '../message-kind'
import { Caption } from './text-body'

export function VideoBody({ view, message }: MessageBodyProps<'video'>) {
  const source = mediaSource(message, view.media)

  if (source.state !== 'ready') {
    return (
      <div className='mt-1'>
        <MediaPlaceholder source={source} label='Video' />
        {view.caption && <Caption text={view.caption} />}
      </div>
    )
  }

  return (
    <div className='mt-1 w-fit max-w-[min(20.5rem,100%)]'>
      <div
        className='relative w-[min(18rem,100%)] overflow-hidden rounded-xl border bg-black'
        style={
          mediaFrameStyle(view.media.width, view.media.height) ?? {
            aspectRatio: '16 / 9',
          }
        }
      >
        {/* Native controls: keyboard, captions, fullscreen and PiP for free. */}
        <video
          src={source.src}
          controls={!source.uploading}
          preload='metadata'
          playsInline
          aria-label={view.caption ?? 'Video'}
          className='block size-full max-h-[26rem] object-contain'
        />
        {source.uploading && <UploadProgress progress={source.progress} />}
      </div>
      {view.caption && <Caption text={view.caption} />}
    </div>
  )
}
