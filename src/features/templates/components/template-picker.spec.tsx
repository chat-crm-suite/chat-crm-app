import type { ReactNode } from 'react'
import { AxiosError, AxiosHeaders } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_TEMPLATES } from '../__fixtures__/templates'
import { TemplatePicker } from './template-picker'

const mocks = vi.hoisted(() => ({
  listTemplates: vi.fn(),
  uploadTemplateHeader: vi.fn(),
  sendConversationTemplate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/template.service', () => ({
  listTemplates: mocks.listTemplates,
  uploadTemplateHeader: mocks.uploadTemplateHeader,
}))
vi.mock('@/services/chat.service', () => ({
  sendConversationTemplate: mocks.sendConversationTemplate,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

const approvedSales = FIXTURE_TEMPLATES.filter(
  (template) =>
    template.channelId === 'ch-wa-main' && template.status === 'approved'
)

function renderPicker() {
  const onOpenChange = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  render(
    <TemplatePicker
      conversationId='conv-1'
      channelId='ch-wa-main'
      open
      onOpenChange={onOpenChange}
    />,
    { wrapper }
  )
  return { onOpenChange, user: userEvent.setup() }
}

describe('TemplatePicker', () => {
  beforeEach(() => {
    mocks.listTemplates.mockReset().mockResolvedValue(approvedSales)
    mocks.sendConversationTemplate.mockReset()
    mocks.uploadTemplateHeader.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:header')
    URL.revokeObjectURL = vi.fn()
    mocks.toast.success.mockReset()
    mocks.toast.error.mockReset()
  })

  it('lists only the approved templates of the conversation channel', async () => {
    renderPicker()

    expect(
      await screen.findByRole('radio', { name: /seguimiento_pedido/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /retomar_conversacion/ })
    ).toBeInTheDocument()
    expect(mocks.listTemplates).toHaveBeenCalledWith({
      channelId: 'ch-wa-main',
      status: 'approved',
    })
  })

  it('fills one field per variable and renders the live preview', async () => {
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /seguimiento_pedido/ })
    )

    // Empty variables keep (and highlight) their placeholder.
    expect(screen.getByText('Tu pedido')).toBeInTheDocument()
    expect(screen.getAllByText('{{1}}').length).toBeGreaterThan(0)
    expect(screen.getByText('Faltan 4 variables')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre del cliente'), 'Rosa')
    await user.type(screen.getByLabelText('Variable {{2}}'), 'PED-77')
    await user.type(screen.getByLabelText('Fecha de entrega'), 'lunes')

    expect(
      screen.getByText('Hola Rosa, tu pedido PED-77 sale hoy. Llega el lunes.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar plantilla' })
    ).toBeDisabled()

    await user.type(
      screen.getByLabelText('Número de pedido · Encabezado'),
      'PED-77'
    )
    expect(screen.getByText('Tu pedido PED-77')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar plantilla' })
    ).toBeEnabled()
  })

  it('sends the template with params keyed by component and variable', async () => {
    mocks.sendConversationTemplate.mockResolvedValue({
      messageId: 'msg-1',
      conversationId: 'conv-1',
    })
    const { user, onOpenChange } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /retomar_conversacion/ })
    )
    await user.type(screen.getByLabelText('Nombre del cliente'), '  Rosa ')
    await user.click(screen.getByRole('button', { name: 'Enviar plantilla' }))

    expect(mocks.sendConversationTemplate).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        templateId: 'tpl-retomar',
        params: { 'body:1': 'Rosa' },
        clientMessageId: expect.any(String),
      })
    )
    expect(mocks.toast.success).toHaveBeenCalledWith('Plantilla enviada')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('explains a ConversationErrorCode answer in Spanish', async () => {
    mocks.sendConversationTemplate.mockRejectedValue(
      new AxiosError('conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: { code: 'template_unavailable', message: 'Template unavailable' },
        headers: {},
        config: { headers: new AxiosHeaders() },
      })
    )
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /retomar_conversacion/ })
    )
    await user.type(screen.getByLabelText('Nombre del cliente'), 'Rosa')
    await user.click(screen.getByRole('button', { name: 'Enviar plantilla' }))

    expect(mocks.toast.error).toHaveBeenCalledWith(
      'La plantilla ya no está disponible (no aprobada, oculta o de otro canal).'
    )
  })

  it('survives a channel without approved templates', async () => {
    mocks.listTemplates.mockResolvedValue([])
    renderPicker()

    expect(
      await screen.findByText('No hay plantillas aprobadas para este canal.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar plantilla' })
    ).toBeDisabled()
  })
  it('requires the header file of a media template, then sends its uploadId', async () => {
    mocks.uploadTemplateHeader.mockResolvedValue({
      uploadId: '3f0c1d9e-4a6b-4c1e-9d2a-7b8c9d0e1f2a',
      kind: 'image',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      filename: 'promo.jpg',
      durationMs: null,
      width: 800,
      height: 600,
      expiresAt: new Date(Date.now() + 60_000),
    })
    mocks.sendConversationTemplate.mockResolvedValue({
      messageId: 'msg-2',
      conversationId: 'conv-1',
    })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /promo_con_imagen/ })
    )
    expect(screen.getByText('Faltan archivos por adjuntar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar plantilla' })
    ).toBeDisabled()

    const file = new File(['jpg'], 'promo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Imagen del encabezado'), file)

    expect(mocks.uploadTemplateHeader).toHaveBeenCalledWith(
      'tpl-promo-imagen',
      file,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(await screen.findByText('Listo para enviar')).toBeInTheDocument()
    // The preview shows the chosen picture before sending.
    expect(screen.getByRole('img', { name: 'promo.jpg' })).toHaveAttribute(
      'src',
      'blob:header'
    )

    await user.click(screen.getByRole('button', { name: 'Enviar plantilla' }))
    expect(mocks.sendConversationTemplate).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        templateId: 'tpl-promo-imagen',
        headerMedia: { uploadId: '3f0c1d9e-4a6b-4c1e-9d2a-7b8c9d0e1f2a' },
      })
    )
  })

  it('refuses a header file over the channel limit before uploading', async () => {
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /promo_con_imagen/ })
    )
    const huge = new File(['x'], 'enorme.jpg', { type: 'image/jpeg' })
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 })
    await user.upload(screen.getByLabelText('Imagen del encabezado'), huge)

    expect(screen.getByRole('alert')).toHaveTextContent('«enorme.jpg» supera')
    expect(mocks.uploadTemplateHeader).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Enviar plantilla' })
    ).toBeDisabled()
  })

  it('explains an upload refusal from the API in Spanish', async () => {
    mocks.uploadTemplateHeader.mockRejectedValue(
      new AxiosError('bad request', '400', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        data: { code: 'content_mismatch', message: 'Content mismatch' },
        headers: {},
        config: { headers: new AxiosHeaders() },
      })
    )
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /promo_con_imagen/ })
    )
    await user.upload(
      screen.getByLabelText('Imagen del encabezado'),
      new File(['jpg'], 'raro.jpg', { type: 'image/jpeg' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El contenido del archivo no corresponde a un formato compatible'
    )
  })

  it('disables a carousel synced without its cards and says why', async () => {
    renderPicker()

    const carousel = await screen.findByRole('radio', {
      name: /catalogo_carrusel/,
    })
    expect(carousel).toBeDisabled()
    expect(carousel).toHaveTextContent(
      'Carrusel sin tarjetas o no admitido por este canal: sincroniza las plantillas'
    )
  })

  it('asks for one file per carousel card, previews the cards and sends them in order', async () => {
    const ids = [
      '3f0c1d9e-4a6b-4c1e-9d2a-7b8c9d0e1f2a',
      '4a1d2e0f-5b7c-4d2f-8e3b-8c9d0e1f2a3b',
    ]
    mocks.uploadTemplateHeader.mockImplementation(
      (_id: string, _file: File, options: { card?: number }) =>
        Promise.resolve(stagedImage(ids[options.card ?? 0]))
    )
    mocks.sendConversationTemplate.mockResolvedValue({
      messageId: 'msg-3',
      conversationId: 'conv-1',
    })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('radio', { name: /recetas_carrusel/ })
    )
    // Both cards render in the preview, the card variable is filled live.
    const cards = screen.getByRole('list', { name: 'Tarjetas del carrusel' })
    expect(within(cards).getAllByRole('listitem')).toHaveLength(2)
    expect(within(cards).getByText('Cena en una sola bandeja')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Variable \{\{1\}\} · Tarjeta 2/), 'Ana')
    expect(within(cards).getByText(/Ensalada para/)).toHaveTextContent('Ensalada para Ana')

    const send = screen.getByRole('button', { name: 'Enviar plantilla' })
    const first = new File(['a'], 'cena.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Imagen de la tarjeta 1'), first)
    expect(send).toBeDisabled()
    await user.upload(
      screen.getByLabelText('Imagen de la tarjeta 2'),
      new File(['b'], 'ensalada.jpg', { type: 'image/jpeg' })
    )

    expect(mocks.uploadTemplateHeader).toHaveBeenCalledWith(
      'tpl-recetas',
      first,
      expect.objectContaining({ card: 0 })
    )
    await screen.findAllByText('Listo para enviar')
    await user.click(send)
    expect(mocks.sendConversationTemplate).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        templateId: 'tpl-recetas',
        params: { 'carousel:1.body.1': 'Ana' },
        cards: [
          { headerMedia: { uploadId: ids[0] } },
          { headerMedia: { uploadId: ids[1] } },
        ],
      })
    )
  })
})

function stagedImage(uploadId: string) {
  return {
      uploadId,
      kind: 'image',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      filename: 'card.jpg',
      durationMs: null,
      width: 800,
      height: 600,
      expiresAt: new Date(Date.now() + 60_000),
    }
}
