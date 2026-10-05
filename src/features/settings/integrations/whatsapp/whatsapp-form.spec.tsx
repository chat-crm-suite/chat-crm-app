import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { WhatsAppConfigResponse } from '@chat-crm/contracts'

import { useAuthStore } from '@/stores/auth-store'
import { getConfig, saveConfig } from '@/services/whatsapp.service'
import { WhatsappForm } from './whatsapp-form'

vi.mock('@/services/whatsapp.service', () => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
}))

const WEBHOOK_PATH = '/integration/webhook/whatsapp'
const DOMAIN = 'http://localhost:3000'
const FULL_URL = `${DOMAIN}${WEBHOOK_PATH}`

const config: WhatsAppConfigResponse = {
  id: 'channel-1',
  type: 'whatsapp',
  name: 'WhatsApp',
  externalAccountId: '123456789012345',
  displayAddress: null,
  status: 'active',
  apiBaseUrl: 'https://graph.facebook.com',
  businessId: '123456789012345',
  apiVersion: 'v22.0',
  hasCredentials: true,
  accessToken: 'EAAB-stored-access-token',
  webhookVerifyToken: 'verify-token-123',
  webhookUrl: FULL_URL,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const getConfigMock = vi.mocked(getConfig)
const saveConfigMock = vi.mocked(saveConfig)

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <WhatsappForm />
    </QueryClientProvider>
  )
}

describe('WhatsappForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getConfigMock.mockResolvedValue(config)
    saveConfigMock.mockResolvedValue(config)
    useAuthStore.setState((state) => ({
      auth: { ...state.auth, company: { id: 'company-1' } },
    }))
  })

  it('shows only the domain in the input and the fixed path once', async () => {
    renderForm()

    const input = await screen.findByLabelText('Webhook Url')

    // El backend guarda la URL completa: el formulario muestra solo el dominio.
    expect(input).toHaveValue(DOMAIN)
    // El path fijo se muestra una sola vez, como addon no editable.
    expect(screen.getAllByText(WEBHOOK_PATH)).toHaveLength(1)
    expect(screen.queryByText(FULL_URL)).not.toBeInTheDocument()
  })

  it('keeps both webhook rows inside the layout', async () => {
    renderForm()

    const urlRow = await screen.findByTestId('webhook-url-row')
    const verifyRow = screen.getByTestId('webhook-verify-row')

    expect(urlRow).toHaveClass('flex-wrap')
    expect(verifyRow).toHaveClass('flex-wrap')

    const urlItem = screen
      .getByLabelText('Webhook Url')
      .closest('[data-slot="form-item"]')
    const verifyItem = screen
      .getByLabelText('Verify Token')
      .closest('[data-slot="form-item"]')

    expect(urlItem).toHaveClass('min-w-0', 'flex-1')
    expect(verifyItem).toHaveClass('min-w-0', 'flex-1')
  })

  it('copies the full webhook url joined with the fixed path', async () => {
    const user = userEvent.setup()
    renderForm()

    const row = await screen.findByTestId('webhook-url-row')
    await user.click(within(row).getByRole('button'))

    await expect(navigator.clipboard.readText()).resolves.toBe(FULL_URL)
  })

  it('saves the full webhook url joined with the fixed path', async () => {
    const user = userEvent.setup()
    renderForm()

    const input = await screen.findByLabelText('Webhook Url')
    await user.clear(input)
    await user.type(input, 'https://midominio.dev')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await vi.waitFor(() => expect(saveConfigMock).toHaveBeenCalledTimes(1))

    const [savedBusinessId, payload] = saveConfigMock.mock.calls[0]
    expect(savedBusinessId).toBe('company-1')
    expect(payload.webhookUrl).toBe(`https://midominio.dev${WEBHOOK_PATH}`)
  })

  it('does not duplicate the path when the saved url has no suffix', async () => {
    const user = userEvent.setup()
    getConfigMock.mockResolvedValue({ ...config, webhookUrl: DOMAIN })
    renderForm()

    const input = await screen.findByLabelText('Webhook Url')
    expect(input).toHaveValue(DOMAIN)

    const row = screen.getByTestId('webhook-url-row')
    await user.click(within(row).getByRole('button'))

    await expect(navigator.clipboard.readText()).resolves.toBe(FULL_URL)
    expect(screen.getAllByText(WEBHOOK_PATH)).toHaveLength(1)
  })

  it('prefills the stored access token in a masked input', async () => {
    renderForm()

    const input = await screen.findByPlaceholderText('Token de acceso de Meta')

    await waitFor(() => expect(input).toHaveValue(config.accessToken))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('reveals and copies the exact verify token', async () => {
    const user = userEvent.setup()
    renderForm()

    const row = await screen.findByTestId('webhook-verify-row')
    const input = screen.getByLabelText('Verify Token')

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue(config.webhookVerifyToken)

    await user.click(
      within(row).getByRole('button', { name: 'Mostrar contraseña' })
    )

    expect(input).toHaveAttribute('type', 'text')

    await user.click(within(row).getByRole('button', { name: '' }))

    await expect(navigator.clipboard.readText()).resolves.toBe(
      config.webhookVerifyToken
    )
  })
})
