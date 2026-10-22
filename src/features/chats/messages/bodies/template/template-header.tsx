import type { MessageBodyProps, ViewOf } from '../../message-kind'
import { DocumentBody } from '../document-body'
import { ImageBody } from '../image-body'
import { VideoBody } from '../video-body'

type MediaHeader = Extract<NonNullable<ViewOf<'template'>['header']>, { kind: 'media' }>

/**
 * The file of a template header, rendered by the same views as a plain
 * image, video or document message (loading, failed, lightbox, download),
 * so a header file behaves exactly like any other file in the thread.
 */
export function TemplateHeaderMedia({
  header,
  ...row
}: { header: MediaHeader } & Omit<MessageBodyProps<'template'>, 'view'>) {
  switch (header.mediaType) {
    case 'image':
      return (
        <ImageBody
          {...row}
          view={{ type: 'image', media: header.media, caption: null }}
        />
      )
    case 'video':
      return (
        <VideoBody
          {...row}
          view={{ type: 'video', media: header.media, caption: null }}
        />
      )
    case 'document':
      return (
        <DocumentBody
          {...row}
          view={{
            type: 'document',
            media: header.media,
            filename: header.filename,
            caption: null,
          }}
        />
      )
  }
}
