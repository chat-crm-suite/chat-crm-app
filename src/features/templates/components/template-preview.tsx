import {
  renderTemplateText,
  type TemplateComponent,
  type TemplateHeaderMedia,
} from '@chat-crm/contracts'
import { FileText, ImageIcon, MapPin, Video } from 'lucide-react'
import { TemplateCard } from './template-card'

const MEDIA_ICON = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  location: MapPin,
} as const

/** A header file chosen in the picker, shown before it is sent. */
export interface HeaderFilePreview {
  mediaType: TemplateHeaderMedia
  /** Local `blob:` URL of the chosen file. */
  url: string
  name: string
}

/** Highlights placeholders that are still empty (`{{2}}`). */
function Rendered({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*[\w.]+\s*\}\})/g)
  return (
    <>
      {parts.map((part, index) =>
        /^\{\{/.test(part) ? (
          <mark
            key={index}
            className='bg-warning/25 text-foreground rounded px-0.5 font-mono text-[0.85em]'
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}

/** The chosen header file, or a placeholder of its kind until there is one. */
function HeaderMediaSlot({
  format,
  file,
}: {
  format: keyof typeof MEDIA_ICON
  file?: HeaderFilePreview | null
}) {
  if (file?.mediaType === 'image') {
    return (
      <img
        src={file.url}
        alt={file.name}
        className='bg-muted block max-h-48 w-full object-cover'
      />
    )
  }
  if (file?.mediaType === 'video') {
    return (
      <video
        src={file.url}
        muted
        playsInline
        aria-label={file.name}
        className='bg-muted block max-h-48 w-full object-cover'
      />
    )
  }

  const Icon = MEDIA_ICON[format]
  return (
    <div className='bg-muted text-muted-foreground flex h-24 flex-col items-center justify-center gap-1'>
      <Icon className='size-6' aria-hidden />
      {file && <span className='max-w-[90%] truncate text-xs'>{file.name}</span>}
    </div>
  )
}

/**
 * Live bubble of a template: header, body, footer and buttons as the
 * customer will see them, filled through the shared `renderTemplateText`
 * (missing values keep their placeholder, highlighted).
 */
export function TemplatePreview({
  components,
  params,
  headerFile,
  className,
}: {
  components: TemplateComponent[]
  params: Readonly<Record<string, string>>
  /** Header file chosen for a media header. */
  headerFile?: HeaderFilePreview | null
  className?: string
}) {
  const header = components.find((component) => component.type === 'header')
  const body = components.find((component) => component.type === 'body')
  const footer = components.find((component) => component.type === 'footer')
  const buttons = components.find((component) => component.type === 'buttons')
  const mediaFormat =
    header?.format && header.format !== 'text' ? header.format : null

  return (
    <TemplateCard
      className={className}
      media={
        mediaFormat ? (
          <HeaderMediaSlot format={mediaFormat} file={headerFile} />
        ) : undefined
      }
      title={
        header?.text && !mediaFormat ? (
          <Rendered text={renderTemplateText(header.text, 'header', params)} />
        ) : undefined
      }
      body={
        body?.text ? (
          <Rendered text={renderTemplateText(body.text, 'body', params)} />
        ) : undefined
      }
      footer={footer?.text}
      buttons={buttons?.buttons ?? []}
    />
  )
}
