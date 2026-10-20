import type { ReactNode } from 'react'
import { AxiosError, AxiosHeaders } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_TEMPLATES } from '../__fixtures__/templates'
import { TemplatePicker } from './template-picker'

const mocks = vi.hoisted(() => ({
  listTemplates: vi.fn(),
  sendConversationTemplate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/template.service', () => ({
  listTemplates: mocks.listTemplates,
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
})
