import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { API_URL } from '@/lib/http'
import { messageWith, readyMedia, templateView } from '../../../testing/messages'
import { MessageBody } from '../../message-body'

type View = ReturnType<typeof templateView>

const renderTemplate = (view: View) =>
  render(
    <MessageBody
      view={view}
      message={messageWith(view, { sender: { id: 'member-1', type: 'member' } })}
      isMine
      senderName='Tú'
      channelType='whatsapp'
    />
  )

describe('TemplateBody (sent template in the thread)', () => {
  it('labels the row as a template and shows the filled body', () => {
    renderTemplate(templateView())

    expect(screen.getByText('seguimiento_pedido')).toBeInTheDocument()
    expect(screen.getByText(/Plantilla/)).toBeInTheDocument()
    expect(
      screen.getByText('Hola Rosa, tu pedido PED-77 sale hoy.')
    ).toBeInTheDocument()
  })

  it('renders a text header, the footer and every button', () => {
    renderTemplate(
      templateView({
        header: { kind: 'text', text: 'Tu pedido PED-77' },
        footer: 'Responde si tienes dudas.',
        buttons: [
          { type: 'quick_reply', text: 'Gracias' },
          { type: 'url', text: 'Ver pedido', url: 'https://example.com/p/77' },
        ],
      })
    )

    expect(screen.getByText('Tu pedido PED-77')).toBeInTheDocument()
    expect(screen.getByText('Responde si tienes dudas.')).toBeInTheDocument()
    expect(screen.getByText('Gracias')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toHaveAttribute(
      'href',
      'https://example.com/p/77'
    )
  })

  it('shows a ready image header through the image view', () => {
    renderTemplate(
      templateView({
        header: {
          kind: 'media',
          mediaType: 'image',
          media: readyMedia(),
          filename: null,
        },
      })
    )

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      `${API_URL}/attachments/att-1`
    )
    expect(
      screen.getByRole('button', { name: 'Ampliar imagen' })
    ).toBeInTheDocument()
  })

  it('shows a loading placeholder while the header file is pending', () => {
    renderTemplate(
      templateView({
        header: {
          kind: 'media',
          mediaType: 'image',
          media: readyMedia({ status: 'pending', url: null }),
          filename: null,
        },
      })
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/Cargando imagen/)).toBeInTheDocument()
  })

  it('says the file is unavailable when the header file failed', () => {
    renderTemplate(
      templateView({
        header: {
          kind: 'media',
          mediaType: 'document',
          media: readyMedia({
            status: 'failed',
            url: null,
            mimeType: 'application/pdf',
          }),
          filename: 'catalogo.pdf',
        },
      })
    )

    expect(screen.getByText('catalogo.pdf')).toBeInTheDocument()
    expect(screen.getByText('Archivo no disponible')).toBeInTheDocument()
  })

  it('renders carousel cards in order, each with its own file, text and button', () => {
    const card = (body: string, id: string) => ({
      header: {
        kind: 'media' as const,
        mediaType: 'image' as const,
        media: readyMedia({ attachmentId: id, url: `/attachments/${id}` }),
        filename: null,
      },
      body,
      buttons: [{ type: 'url' as const, text: 'Ver receta', url: `https://example.com/${id}` }],
    })
    renderTemplate(
      templateView({
        body: 'Recetas frescas de verano.',
        cards: [card('Cena en una bandeja', 'att-1'), card('Ensalada para Ana', 'att-2')],
      })
    )

    expect(screen.getByText('Recetas frescas de verano.')).toBeInTheDocument()
    const items = within(
      screen.getByRole('list', { name: 'Tarjetas del carrusel' })
    ).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Cena en una bandeja')).toBeInTheDocument()
    expect(within(items[1]).getByText('Ensalada para Ana')).toBeInTheDocument()
    expect(within(items[1]).getByRole('img')).toHaveAttribute(
      'src',
      `${API_URL}/attachments/att-2`
    )
    expect(within(items[1]).getByRole('link', { name: 'Ver receta' })).toHaveAttribute(
      'href',
      'https://example.com/att-2'
    )
  })

  it('shows no carousel row for a template without cards', () => {
    renderTemplate(templateView())
    expect(screen.queryByRole('list', { name: 'Tarjetas del carrusel' })).not.toBeInTheDocument()
  })
})
