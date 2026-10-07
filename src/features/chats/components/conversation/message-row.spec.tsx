import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { API_URL } from '@/lib/http'
import type { ChatMessage } from '../../types/chat.domain'
import { MessageRow, type SenderView } from './message-row'

const mine: SenderView = { name: 'Tú', initials: 'AC' }

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    timestamp: new Date('2026-10-06T09:12:00'),
    status: 'read',
    sender: { id: 'member-1', type: 'member' },
    msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
    ...overrides,
  }
}

const renderRow = (message: ChatMessage, sender: SenderView = mine) =>
  render(
    <MessageRow message={message} sender={sender} onRetry={vi.fn()} />
  )

describe('MessageRow', () => {
  it.each([
    ['pending', 'Enviando'],
    ['sent', 'Enviado'],
    ['delivered', 'Entregado'],
    ['read', 'Leído'],
  ] as const)('renders the %s state tick', (status, label) => {
    renderRow(makeMessage({ status }))

    expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('offers a retry for failed outbound messages', async () => {
    const onRetry = vi.fn()
    const message = makeMessage({ status: 'failed' })
    render(<MessageRow message={message} sender={mine} onRetry={onRetry} />)

    expect(screen.getByLabelText('Falló')).toBeInTheDocument()

    screen.getByRole('button', { name: /reintentar/i }).click()

    expect(onRetry).toHaveBeenCalledWith(message)
  })

  it('does not offer retry on inbound messages', () => {
    renderRow(
      makeMessage({
        status: 'failed',
        sender: { id: 'customer-1', type: 'customer' },
      }),
      {
        name: 'Rosa Medina',
        initials: 'RM',
      }
    )

    expect(
      screen.queryByRole('button', { name: /reintentar/i })
    ).not.toBeInTheDocument()
  })

  it('shows a spinner while an attachment is pending', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'image',
          mediaUrl: null,
          attachmentStatus: 'pending',
          content: { caption: 'transferencia.jpg' },
        },
      })
    )

    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.getByText('Cargando archivo…')).toBeInTheDocument()
  })

  it('renders a ready image as a bordered card', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'image',
          mediaUrl: '/uploads/foto.jpg',
          attachmentStatus: 'ready',
          content: { caption: '¿Estos precios incluyen IGV?' },
        },
      })
    )

    expect(screen.getByRole('img', { name: '¿Estos precios incluyen IGV?' })).toHaveAttribute(
      'src',
      `${API_URL}/uploads/foto.jpg`
    )
  })

  it('opens the full-size viewer when the image is clicked', async () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'image',
          mediaUrl: '/uploads/foto.jpg',
          attachmentStatus: 'ready',
          content: { caption: 'Firewatch Sunset' },
        },
      })
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Ampliar imagen' })
    )

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('img', { name: 'Firewatch Sunset' })
    ).toHaveAttribute('src', `${API_URL}/uploads/foto.jpg`)
    expect(within(dialog).getByText('Tú')).toBeInTheDocument()
  })

  it('overlays the time and tick on a captionless image', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'image',
          mediaUrl: '/uploads/foto.jpg',
          attachmentStatus: 'ready',
          content: {},
        },
      })
    )

    const overlay = screen.getByTestId('image-meta-overlay')
    expect(overlay).toHaveTextContent('09:12')
    expect(within(overlay).getByLabelText('Leído')).toBeInTheDocument()
  })

  it('renders a ready document card with its filename and type fallback', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'document',
          mediaUrl: null,
          attachmentStatus: 'ready',
          content: {
            caption: 'Aquí va la cotización actualizada.',
            filename: 'cotizacion-rosa.pdf',
          },
        },
      })
    )

    expect(screen.getByText('cotizacion-rosa.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(
      screen.getByText('Aquí va la cotización actualizada.')
    ).toBeInTheDocument()
  })

  it('shows the document metadata and download actions when the API exposes them', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'document',
          mediaUrl: '/uploads/cotizacion-rosa.pdf',
          attachmentStatus: 'ready',
          mimeType: 'application/pdf',
          sizeBytes: 2516582,
          content: { filename: 'cotizacion-rosa.pdf' },
        },
      })
    )

    expect(screen.getByText('cotizacion-rosa.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF · 2.4 MB')).toBeInTheDocument()

    const download = screen.getByRole('link', {
      name: 'Descargar cotizacion-rosa.pdf',
    })
    expect(download).toHaveAttribute(
      'href',
      `${API_URL}/uploads/cotizacion-rosa.pdf`
    )
    expect(download).toHaveAttribute('download', 'cotizacion-rosa.pdf')

    expect(
      screen.getByRole('link', { name: 'Abrir cotizacion-rosa.pdf' })
    ).toHaveAttribute('href', `${API_URL}/uploads/cotizacion-rosa.pdf`)
  })

  it('renders a failed attachment honestly', () => {
    renderRow(
      makeMessage({
        msg: {
          type: 'document',
          mediaUrl: null,
          attachmentStatus: 'failed',
          content: { filename: 'comprobante-pago.pdf' },
        },
      })
    )

    expect(screen.getByText('comprobante-pago.pdf')).toBeInTheDocument()
    expect(screen.getByText('Archivo no disponible')).toBeInTheDocument()
  })

  it("treats a media payload without url as unavailable (today's fields)", () => {
    renderRow(
      makeMessage({
        status: 'read',
        msg: { type: 'image', mediaUrl: null, content: {} },
      })
    )

    expect(screen.getByText('Archivo no disponible')).toBeInTheDocument()
  })
})
