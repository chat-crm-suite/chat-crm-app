import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { API_URL } from '@/lib/http'
import { messageWith, makeMessage, readyMedia } from '../../testing/messages'
import type { ChatMessage } from '../../types/chat.domain'
import { MessageRow, type SenderView } from './message-row'

const mine: SenderView = { name: 'Tú', initials: 'AC', isSelf: true }
const customer: SenderView = { name: 'Rosa Medina', initials: 'RM' }

const outgoing = (overrides: Partial<ChatMessage> = {}) =>
  makeMessage({
    timestamp: new Date('2026-10-06T09:12:00'),
    status: 'read',
    sender: { id: 'member-1', type: 'member' },
    ...overrides,
  })

const renderRow = (message: ChatMessage, sender: SenderView = mine) =>
  render(<MessageRow message={message} sender={sender} onRetry={vi.fn()} />)

describe('MessageRow', () => {
  describe('ticks and retry', () => {
    it.each([
      ['pending', 'Enviando'],
      ['sent', 'Enviado'],
      ['delivered', 'Entregado'],
      ['read', 'Leído'],
    ] as const)('renders the %s state tick', (status, label) => {
      renderRow(outgoing({ status }))

      expect(screen.getByLabelText(label)).toBeInTheDocument()
    })

    it('offers a retry for failed outbound messages', async () => {
      const onRetry = vi.fn()
      const message = outgoing({ status: 'failed' })
      render(<MessageRow message={message} sender={mine} onRetry={onRetry} />)

      expect(screen.getByLabelText('Falló')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

      expect(onRetry).toHaveBeenCalledWith(message)
    })

    it('never ticks nor retries inbound messages', () => {
      renderRow(makeMessage({ status: 'failed' }), customer)

      expect(screen.queryByLabelText('Falló')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
    })
  })

  describe('layout', () => {
    it('aligns the customer to the start and the team to the end', () => {
      const { container, unmount } = renderRow(makeMessage(), customer)
      expect(container.querySelector('[data-slot=message]')).toHaveAttribute(
        'data-align',
        'start'
      )
      unmount()

      const { container: team } = renderRow(outgoing())
      expect(team.querySelector('[data-slot=message]')).toHaveAttribute(
        'data-align',
        'end'
      )
    })

    it('names the customer only on the first message of a run', () => {
      const { rerender } = render(
        <MessageRow message={makeMessage()} sender={customer} onRetry={vi.fn()} />
      )
      expect(screen.getByText('Rosa Medina')).toBeInTheDocument()

      rerender(
        <MessageRow
          message={makeMessage()}
          sender={customer}
          showSender={false}
          onRetry={vi.fn()}
        />
      )
      expect(screen.queryByText('Rosa Medina')).not.toBeInTheDocument()
    })

    it('turns links in text into new-tab links', () => {
      renderRow(outgoing({ msg: { type: 'text', text: 'Mira https://chat-crm.dev/x ya' } }))

      expect(screen.getByRole('link', { name: 'https://chat-crm.dev/x' })).toHaveAttribute(
        'target',
        '_blank'
      )
    })
  })

  describe('images', () => {
    const image = (caption: string | null) =>
      outgoing({ msg: { type: 'image', media: readyMedia(), caption } })

    it('opens the full-size viewer from our attachments endpoint', async () => {
      renderRow(image('Firewatch Sunset'))

      await userEvent.click(screen.getByRole('button', { name: 'Ampliar imagen' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('img', { name: 'Firewatch Sunset' })).toHaveAttribute(
        'src',
        `${API_URL}/attachments/att-1`
      )
    })

    it('reserves the frame from the known dimensions (no layout jump)', () => {
      renderRow(image(null))

      expect(screen.getByRole('button', { name: 'Ampliar imagen' })).toHaveStyle({
        aspectRatio: '640 / 480',
      })
    })

    it('overlays the time and tick on a captionless image', () => {
      const { container } = renderRow(image(null))

      const meta = container.querySelector('[data-slot=message-meta]') as HTMLElement
      expect(meta).toHaveTextContent('09:12')
      expect(within(meta).getByLabelText('Leído')).toBeInTheDocument()
    })

    it('shows the local preview with upload progress while sending', () => {
      renderRow(
        outgoing({
          status: 'pending',
          msg: {
            type: 'image',
            media: readyMedia({ status: 'pending', url: null }),
            caption: null,
          },
          local: { previewUrl: 'blob:preview', progress: 0.4 },
        })
      )

      expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview')
      expect(screen.getByRole('progressbar', { name: 'Enviando archivo' })).toHaveAttribute(
        'aria-valuenow',
        '40'
      )
    })
  })

  describe('documents', () => {
    it('renders the card with name, type, size and download', () => {
      renderRow(
        outgoing({
          msg: {
            type: 'document',
            media: readyMedia({ mimeType: 'application/pdf', sizeBytes: 2_516_582 }),
            filename: 'cotizacion.pdf',
            caption: null,
          },
        })
      )

      expect(screen.getByText('cotizacion.pdf')).toBeInTheDocument()
      expect(screen.getByText('PDF · 2.4 MB')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Descargar cotizacion.pdf' })).toHaveAttribute(
        'href',
        `${API_URL}/attachments/att-1`
      )
    })
  })

  describe('media states', () => {
    it('shows a loader while the customer file is still being fetched', () => {
      renderRow(
        messageWith({
          type: 'image',
          media: readyMedia({ status: 'pending', url: null }),
          caption: null,
        }),
        customer
      )

      expect(screen.getByText('Cargando imagen…')).toBeInTheDocument()
    })

    it('says so when the file is gone', () => {
      renderRow(
        messageWith({
          type: 'video',
          media: readyMedia({ status: 'failed', url: null }),
          caption: null,
        }),
        customer
      )

      expect(screen.getByText('Video no disponible')).toBeInTheDocument()
    })
  })

  describe('audio, video, stickers and other kinds', () => {
    it('plays voice notes with a speed control', () => {
      renderRow(
        outgoing({
          msg: {
            type: 'audio',
            media: readyMedia({ mimeType: 'audio/ogg', durationMs: 65_000 }),
            voice: true,
          },
        })
      )

      expect(screen.getByRole('button', { name: 'Reproducir nota de voz' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Velocidad 1x' })).toBeInTheDocument()
      // The recorder-measured duration shows before the file loads.
      expect(screen.getByText('1:05')).toBeInTheDocument()
    })

    it('plays videos with the native controls', () => {
      const { container } = renderRow(
        outgoing({
          msg: { type: 'video', media: readyMedia({ mimeType: 'video/mp4' }), caption: 'Clip' },
        })
      )

      const video = container.querySelector('video')
      expect(video).toHaveAttribute('src', `${API_URL}/attachments/att-1`)
      expect(video).toHaveAttribute('controls')
    })

    it('offers to re-send a stored sticker from its menu', async () => {
      const onResendSticker = vi.fn()
      render(
        <MessageRow
          message={makeMessage({
            msg: { type: 'sticker', media: readyMedia({ attachmentId: 'att-9', mimeType: 'image/webp' }) },
          })}
          sender={customer}
          onRetry={vi.fn()}
          onResendSticker={onResendSticker}
        />
      )

      fireEvent.contextMenu(screen.getByRole('img', { name: 'Sticker' }))
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Enviar este sticker' }))

      expect(onResendSticker).toHaveBeenCalledWith({
        attachmentId: 'att-9',
        url: `${API_URL}/attachments/att-1`,
      })
    })

    it('draws stickers without a bubble', () => {
      const { container } = renderRow(
        outgoing({ msg: { type: 'sticker', media: readyMedia({ mimeType: 'image/webp' }) } })
      )

      expect(screen.getByRole('img', { name: 'Sticker' })).toBeInTheDocument()
      expect(container.querySelector('[data-slot=bubble]')).not.toBeInTheDocument()
    })

    it('names kinds it cannot render and keeps their text', () => {
      renderRow(
        messageWith({
          type: 'unsupported',
          originalType: 'location',
          text: '📍 Oficina: 4.60971, -74.08175',
        }),
        customer
      )

      expect(screen.getByText('Ubicación')).toBeInTheDocument()
      expect(screen.getByText(/Oficina/)).toBeInTheDocument()
    })
  })
})
