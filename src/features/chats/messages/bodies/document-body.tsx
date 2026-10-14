import { Download, FileText, FileWarning } from 'lucide-react'

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Spinner } from '@/components/ui/spinner'
import { documentMeta } from '../../lib/attachment-meta'
import { mediaSource } from '../media-source'
import { MessageMeta } from '../message-meta'
import type { MessageBodyProps } from '../message-kind'
import { Caption } from './text-body'

/** WhatsApp-style document card: type, size, open and download. */
export function DocumentBody({ view, message, isMine }: MessageBodyProps<'document'>) {
  const source = mediaSource(message, view.media)
  const name = view.filename ?? 'Documento'
  const ready = source.state === 'ready' && !source.uploading
  const description =
    source.state === 'unavailable'
      ? 'Archivo no disponible'
      : source.state === 'loading'
        ? 'Cargando archivo…'
        : documentMeta({
            mimeType: view.media.mimeType,
            sizeBytes: view.media.sizeBytes,
            filename: view.filename,
          })

  return (
    <div className='flex flex-col'>
      <Attachment
        state={
          source.state === 'unavailable'
            ? 'error'
            : ready
              ? 'done'
              : 'uploading'
        }
        className='w-[min(20rem,100%)] border-none bg-transparent'
      >
        <AttachmentMedia>
          {source.state === 'unavailable' ? (
            <FileWarning />
          ) : ready ? (
            <FileText />
          ) : (
            <Spinner />
          )}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{name}</AttachmentTitle>
          {description && <AttachmentDescription>{description}</AttachmentDescription>}
        </AttachmentContent>
        {ready && (
          <>
            <AttachmentActions>
              <AttachmentAction asChild size='icon-sm' variant='secondary'>
                <a href={source.src} download={name} aria-label={`Descargar ${name}`}>
                  <Download />
                </a>
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger asChild>
              <a
                href={source.src}
                target='_blank'
                rel='noreferrer'
                aria-label={`Abrir ${name}`}
              />
            </AttachmentTrigger>
          </>
        )}
      </Attachment>
      {view.caption ? (
        <Caption text={view.caption} message={message} isMine={isMine} />
      ) : (
        <p className='flex justify-end px-2 pb-1'>
          <MessageMeta
            message={message}
            isMine={isMine}
            className='static float-none ms-0 mt-0'
          />
        </p>
      )}
    </div>
  )
}
