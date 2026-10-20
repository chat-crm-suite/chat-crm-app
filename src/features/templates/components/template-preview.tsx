import { renderTemplateText, type TemplateComponent } from '@chat-crm/contracts'
import {
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  Reply,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MEDIA_ICON = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  location: MapPin,
} as const

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

/**
 * Live bubble of a template: header, body, footer and buttons as the
 * customer will see them, filled through the shared `renderTemplateText`
 * (missing values keep their placeholder, highlighted).
 */
export function TemplatePreview({
  components,
  params,
  className,
}: {
  components: TemplateComponent[]
  params: Readonly<Record<string, string>>
  className?: string
}) {
  const header = components.find((component) => component.type === 'header')
  const body = components.find((component) => component.type === 'body')
  const footer = components.find((component) => component.type === 'footer')
  const buttons = components.find((component) => component.type === 'buttons')
  const MediaIcon =
    header?.format && header.format !== 'text'
      ? MEDIA_ICON[header.format]
      : null

  return (
    <div
      className={cn(
        'bg-muted/40 rounded-xl p-4',
        // Faint chat backdrop, theme tokens only.
        '[background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]',
        className
      )}
    >
      <div className='bg-card ms-auto max-w-[85%] overflow-hidden rounded-xl rounded-se-sm border shadow-xs'>
        {MediaIcon && (
          <div className='bg-muted text-muted-foreground flex h-24 items-center justify-center'>
            <MediaIcon className='size-6' aria-hidden />
          </div>
        )}
        <div className='space-y-1.5 px-3 py-2.5 text-sm'>
          {header?.text && (!header.format || header.format === 'text') && (
            <p className='font-semibold'>
              <Rendered
                text={renderTemplateText(header.text, 'header', params)}
              />
            </p>
          )}
          {body?.text && (
            <p className='whitespace-pre-wrap'>
              <Rendered text={renderTemplateText(body.text, 'body', params)} />
            </p>
          )}
          {footer?.text && (
            <p className='text-muted-foreground text-xs'>{footer.text}</p>
          )}
        </div>
        {buttons?.buttons?.length ? (
          <div className='divide-y border-t'>
            {buttons.buttons.map((button, index) => {
              const Icon =
                button.type === 'url'
                  ? ExternalLink
                  : button.type === 'phone_number'
                    ? Phone
                    : Reply
              return (
                <p
                  key={`${button.text}-${index}`}
                  className='text-foreground flex items-center justify-center gap-1.5 py-2 text-xs font-medium'
                >
                  <Icon className='size-3.5' aria-hidden />
                  {button.text}
                </p>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
