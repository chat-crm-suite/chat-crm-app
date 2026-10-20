import type { ComponentProps } from 'react'
import { channelCapabilities } from '@chat-crm/contracts'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { useComposerAttachments } from '../../hooks/use-composer-attachments'
import { Composer } from './composer'
import { ReplyWindowNotice } from './reply-window-notice'

const toast = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const whatsapp = channelCapabilities('whatsapp')

type HarnessProps = Omit<
  ComponentProps<typeof Composer>,
  'attachments' | 'capabilities'
>

/** The real tray hook, as the chat box wires it. */
function Harness(props: HarnessProps) {
  const attachments = useComposerAttachments(whatsapp)
  return (
    <Composer {...props} attachments={attachments} capabilities={whatsapp} />
  )
}

const file = (name: string, type: string) => new File(['x'], name, { type })

/**
 * Drafts from the Phase 3 copy (greeting, sending the quote, requesting the
 * payment receipt), pinned literally instead of recomputed through the
 * component.
 */
const DRAFTS = {
  greeting: '¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte?',
  quote:
    'Te comparto la cotización solicitada. Quedo atento a cualquier consulta.',
  receipt: '¿Podrías enviarnos el comprobante de pago, por favor?',
} as const

const setup = (connected = true, props: Partial<HarnessProps> = {}) => {
  const onSend = vi.fn()
  render(<Harness connected={connected} onSend={onSend} {...props} />)
  return { onSend, user: userEvent.setup() }
}

const text = (value: string) => ({ type: 'text', text: value })

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:thumb')
  URL.revokeObjectURL = vi.fn()
})

describe('Composer', () => {
  it('sends the trimmed draft on Enter and clears the field', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, '  Hola Rosa  {Enter}')

    expect(onSend).toHaveBeenCalledWith(text('Hola Rosa'))
    expect(field).toHaveValue('')
  })

  it('breaks the line on Shift+Enter without sending', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, 'Línea 1{Shift>}{Enter}{/Shift}Línea 2')

    expect(onSend).not.toHaveBeenCalled()
    expect(field).toHaveValue('Línea 1\nLínea 2')
  })

  it('does not send an empty draft', async () => {
    const { onSend, user } = setup()

    await user.type(
      screen.getByPlaceholderText('Escribe un mensaje…'),
      '   {Enter}'
    )

    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables the field and send while disconnected and shows the banner', () => {
    setup(false)

    const field = screen.getByPlaceholderText('Reconectando…')
    expect(field).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Enviar mensaje' })
    ).toBeDisabled()
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument()
  })

  it('offers photos, videos and documents from the attach menu', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Adjuntar' }))

    expect(
      await screen.findByRole('menuitem', { name: 'Fotos y videos' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Documento' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('media-input')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,video/mp4,video/3gpp'
    )
  })

  it('opens the tray with the picked files and sends them with their captions', async () => {
    const { onSend, user } = setup()
    const photo = file('foto.png', 'image/png')
    const pdf = file('cotizacion.pdf', 'application/pdf')

    await user.upload(screen.getByTestId('media-input'), photo)
    await user.upload(screen.getByTestId('document-input'), pdf)

    expect(
      screen.getByRole('region', { name: 'Archivos para enviar' })
    ).toBeInTheDocument()
    // The last added file is selected: its caption is the one typed into.
    await user.type(
      screen.getByRole('textbox', { name: 'Comentario para cotizacion.pdf' }),
      'Te paso la cotización'
    )
    await user.click(
      screen.getByRole('button', { name: 'Archivo 1 de 2: foto.png' })
    )
    await user.keyboard('Mira{Enter}')

    expect(onSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'image',
        file: photo,
        caption: 'Mira',
      })
    )
    expect(onSend).toHaveBeenNthCalledWith(2, {
      type: 'document',
      file: pdf,
      caption: 'Te paso la cotización',
    })
    expect(
      screen.queryByRole('region', { name: 'Archivos para enviar' })
    ).not.toBeInTheDocument()
    // Typing continues in the message field.
    expect(screen.getByPlaceholderText('Escribe un mensaje…')).toHaveFocus()
  })

  it('takes files pasted into the field', () => {
    setup()
    const photo = file('captura.png', 'image/png')

    fireEvent.paste(screen.getByPlaceholderText('Escribe un mensaje…'), {
      clipboardData: { files: [photo] },
    })

    expect(
      screen.getByRole('region', { name: 'Archivos para enviar' })
    ).toBeInTheDocument()
  })

  it('explains why a file cannot be sent and keeps the composer as is', async () => {
    setup()
    // The input `accept` would filter it out of a real picker.
    const user = userEvent.setup({ applyAccept: false })

    await user.upload(
      screen.getByTestId('document-input'),
      file('virus.exe', 'application/x-msdownload')
    )

    expect(toast.error).toHaveBeenCalledWith(
      'No se puede enviar este archivo',
      {
        description: expect.stringContaining('virus.exe') as string,
      }
    )
    expect(
      screen.queryByRole('region', { name: 'Archivos para enviar' })
    ).not.toBeInTheDocument()
  })

  it('discards the tray with Escape', async () => {
    const { onSend, user } = setup()

    await user.upload(
      screen.getByTestId('media-input'),
      file('a.png', 'image/png')
    )
    await user.click(
      screen.getByRole('textbox', { name: 'Comentario para a.png' })
    )
    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('region', { name: 'Archivos para enviar' })
    ).not.toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it.each([
    ['saludo', DRAFTS.greeting],
    ['cotiza', DRAFTS.quote],
    ['comprob', DRAFTS.receipt],
  ])(
    'inserts a quick reply from the "/" menu (/%s) without sending',
    async (query, draft) => {
      const { onSend, user } = setup()
      const field = screen.getByPlaceholderText('Escribe un mensaje…')

      await user.type(field, `/${query}`)
      expect(
        screen.getByRole('listbox', { name: 'Respuestas rápidas' })
      ).toBeInTheDocument()
      await user.keyboard('{Enter}')

      expect(field).toHaveValue(draft)
      expect(onSend).not.toHaveBeenCalled()
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    }
  )

  it('navigates the "/" menu with the arrows and picks with a click too', async () => {
    const { user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, '/')
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute(
      'aria-selected',
      'true'
    )

    fireEvent.mouseDown(screen.getAllByRole('option')[2])
    expect(field).toHaveValue(DRAFTS.receipt)
    expect(field).toHaveFocus()
  })

  it('closes the "/" menu with Escape', async () => {
    const { user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, '/sal')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(field).toHaveValue('')
  })

  it('opens the "/" menu from its button (no chip row taking space)', async () => {
    const { user } = setup()

    expect(
      screen.queryByRole('button', { name: 'Saludo' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Respuestas rápidas' }))

    expect(
      screen.getByRole('listbox', { name: 'Respuestas rápidas' })
    ).toBeInTheDocument()
  })

  it('sends the inserted reply like typed text', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, '/saludo{Enter}')
    await user.keyboard('{Enter}')

    expect(onSend).toHaveBeenCalledWith(text(DRAFTS.greeting))
    expect(field).toHaveValue('')
  })

  it('offers the template picker from the field when the channel has templates', async () => {
    const onPickTemplate = vi.fn()
    const { user } = setup(true, { onPickTemplate })

    await user.click(screen.getByRole('button', { name: 'Plantilla' }))
    expect(onPickTemplate).toHaveBeenCalledTimes(1)
  })

  it('shows the resolved notice only when the conversation is closed', () => {
    setup(true, { status: 'open' })

    expect(screen.queryByText(/Conversación resuelta/)).not.toBeInTheDocument()
  })

  it('reopens a resolved conversation from its notice', async () => {
    const onReopen = vi.fn()
    const { user } = setup(true, { status: 'closed', onReopen })

    expect(screen.getByText(/Conversación resuelta/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /reabrir/i }))
    expect(onReopen).toHaveBeenCalledTimes(1)
  })

  it('does not block the composer: a resolved conversation still sends', async () => {
    const { onSend, user } = setup(true, { status: 'closed' })
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, 'Mensaje con el caso resuelto{Enter}')

    expect(onSend).toHaveBeenCalledWith(text('Mensaje con el caso resuelto'))
    expect(field).toHaveValue('')
  })

  it('turns into the template-required state when the reply window is closed', async () => {
    const onPickTemplate = vi.fn()
    const { user } = setup(true, {
      locked: (
        <ReplyWindowNotice reason='expired' onPickTemplate={onPickTemplate} />
      ),
    })

    expect(screen.getByText('Ventana de 24 h cerrada')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Escribe un mensaje…')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Adjuntar' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Elegir plantilla' }))
    expect(onPickTemplate).toHaveBeenCalledTimes(1)
  })

  describe('stickers', () => {
    it('re-sends a sticker of the conversation by reference', async () => {
      const { onSend, user } = setup(true, {
        recentStickers: [
          { attachmentId: 'att-9', url: 'http://api/attachments/att-9' },
        ],
      })

      await user.click(screen.getByRole('button', { name: 'Stickers' }))
      const list = await screen.findByRole('list', {
        name: 'Stickers de esta conversación',
      })
      await user.click(
        within(list).getByRole('button', { name: 'Enviar sticker 1' })
      )

      expect(onSend).toHaveBeenCalledWith({
        type: 'sticker',
        attachmentId: 'att-9',
        previewUrl: 'http://api/attachments/att-9',
      })
    })

    it('explains where stickers come from when there are none yet', async () => {
      const { user } = setup()

      await user.click(screen.getByRole('button', { name: 'Stickers' }))

      expect(await screen.findByText('Aún no hay stickers')).toBeInTheDocument()
    })
  })

  describe('voice notes', () => {
    class Recorder {
      static isTypeSupported = (mime: string) => mime.startsWith('audio/webm')
      state = 'inactive'
      mimeType: string
      ondataavailable: ((event: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      constructor(_stream: unknown, options: { mimeType: string }) {
        this.mimeType = options.mimeType
      }
      start() {
        this.state = 'recording'
      }
      pause() {
        this.state = 'paused'
      }
      resume() {
        this.state = 'recording'
      }
      stop() {
        this.ondataavailable?.({ data: new Blob(['opus']) })
        this.state = 'inactive'
        this.onstop?.()
      }
    }

    beforeAll(() => {
      vi.stubGlobal('MediaRecorder', Recorder)
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.resolve({ getTracks: () => [{ stop: vi.fn() }] }),
        },
      })
    })

    it('swaps send for the mic while the field is empty', async () => {
      const { user } = setup()

      expect(
        screen.getByRole('button', { name: 'Grabar nota de voz' })
      ).toBeInTheDocument()
      await user.type(
        screen.getByPlaceholderText('Escribe un mensaje…'),
        'Hola'
      )
      expect(
        screen.queryByRole('button', { name: 'Grabar nota de voz' })
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Enviar mensaje' })
      ).toBeEnabled()
    })

    it('records and sends a voice note', async () => {
      const { onSend, user } = setup()

      await user.click(
        screen.getByRole('button', { name: 'Grabar nota de voz' })
      )
      expect(
        await screen.findByRole('group', { name: 'Grabando nota de voz' })
      ).toBeInTheDocument()
      // The mic is gone: focus moves into the bar, so the keyboard keeps working.
      expect(
        screen.getByRole('button', { name: 'Pausar grabación' })
      ).toHaveFocus()

      await user.click(
        screen.getByRole('button', { name: 'Enviar nota de voz' })
      )

      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audio',
          voice: true,
          file: expect.any(File) as File,
        })
      )
      expect(
        screen.queryByRole('group', { name: 'Grabando nota de voz' })
      ).not.toBeInTheDocument()
    })

    it('discards a recording without sending', async () => {
      const { onSend, user } = setup()

      await user.click(
        screen.getByRole('button', { name: 'Grabar nota de voz' })
      )
      await screen.findByRole('group', { name: 'Grabando nota de voz' })
      await user.keyboard('{Escape}')

      expect(onSend).not.toHaveBeenCalled()
      expect(screen.getByPlaceholderText('Escribe un mensaje…')).toHaveFocus()
      expect(
        screen.getByPlaceholderText('Escribe un mensaje…')
      ).toBeInTheDocument()
    })
  })
})
