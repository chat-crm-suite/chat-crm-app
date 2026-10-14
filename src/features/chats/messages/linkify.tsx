import type { ReactNode } from 'react'

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]}])/g

/**
 * Turns the URLs of a message into links that open in a new tab, keeping the
 * rest as plain text (never HTML: customer text is untrusted).
 */
export function linkify(text: string): ReactNode[] {
  return text.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target='_blank'
        rel='noreferrer noopener'
        className='text-primary underline underline-offset-2 break-all hover:no-underline'
      >
        {part}
      </a>
    ) : (
      part
    )
  )
}
