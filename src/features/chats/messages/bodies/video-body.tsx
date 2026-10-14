import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaFrameStyle, mediaSource } from '../media-source'
import { MessageMeta } from '../message-meta'
import type { MessageBodyProps } from '../message-kind'
import { Caption } from './text-body'

export function VideoBody({ view, message, isMine }: MessageBodyProps<'video'>) {
  const source = mediaSource(message, view.media)

  if (source.state !== 'ready') {
    return (
      <div className='flex flex-col gap-1 p-1'>
        <MediaPlaceholder source={source} label='Video' />
        {view.caption && (
          <Caption text={view.caption} message={message} isMine={isMine} />
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className='bg-foreground/90 relative w-[min(18rem,100%)] overflow-hidden rounded-lg'
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
          className='size-full object-contain'
        />
        {source.uploading && <UploadProgress progress={source.progress} />}
        {!view.caption && source.uploading && (
          <MessageMeta message={message} isMine={isMine} variant='overlay' />
        )}
      </div>
      {view.caption ? (
        <Caption text={view.caption} message={message} isMine={isMine} />
      ) : (
        !source.uploading && (
          <p className='flex justify-end px-2 pt-1'>
            <MessageMeta message={message} isMine={isMine} className='float-none ms-0 mt-0 top-0' />
          </p>
        )
      )}
    </>
  )
}
