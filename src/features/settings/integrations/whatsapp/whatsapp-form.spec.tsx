import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  WHATSAPP_WEBHOOK_PATH,
  type WhatsAppConfigResponse,
  type WhatsAppConnectionTest,
} from '@chat-crm/contracts'
import { toast } from 'sonner'

import { API_URL } from '@/lib/http'
import { useAuthStore } from '@/stores/auth-store'
import {
  getConfig,
  saveConfig,
  testConnection,
} from '@/services/whatsapp.service'
import { WhatsappForm } from './whatsapp-form'

vi.mock('@/services/whatsapp.service', () => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
  }),
}))

const WEBHOOK_PATH = `/${WHATSAPP_WEBHOOK_PATH}`
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
  hasAppSecret: false,
  accessToken: 'EAAB-stored-access-token',
  webhookVerifyToken: 'verify-token-123',
  webhookUrl: FULL_URL,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

/** The channel every company is born with: verify token, no credentials. */
const pendingConfig: WhatsAppConfigResponse = {
  ...config,
  externalAccountId: null,
  status: 'pending',
  businessId: null,
  hasCredentials: false,
  accessToken: null,
  webhookUrl: null,
}

const passed = (message: string) => ({ status: 'ok' as const, message })
const allGood: WhatsAppConnectionTest = {
  ok: true,
  sending: passed('Envío listo.'),
  webhook: { ...passed('Webhook listo.'), url: FULL_URL },
  subscription: passed('Suscripción lista.'),
}

const getConfigMock = vi.mocked(getConfig)
const saveConfigMock = vi.mocked(saveConfig)
const testConnectionMock = vi.mocked(testConnection)

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
    testConnectionMock.mockResolvedValue(allGood)
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

  it('sends a new App Secret and keeps the field write-only', async () => {
    const user = userEvent.setup()
    renderForm()

    const input = await screen.findByLabelText('App Secret')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('type', 'password')

    await user.type(input, 'abcdef0123456789abcdef0123456789')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await vi.waitFor(() => expect(saveConfigMock).toHaveBeenCalledTimes(1))
    expect(saveConfigMock.mock.calls[0][1].appSecret).toBe(
      'abcdef0123456789abcdef0123456789'
    )
  })

  it('omits the App Secret when left empty, keeping the stored one', async () => {
    const user = userEvent.setup()
    getConfigMock.mockResolvedValue({ ...config, hasAppSecret: true })
    renderForm()

    expect(await screen.findByText(/Configurado ✓/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await vi.waitFor(() => expect(saveConfigMock).toHaveBeenCalledTimes(1))
    expect(saveConfigMock.mock.calls[0][1].appSecret).toBeUndefined()
  })

  it('rejects an App Secret that is not 32 hex chars', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(await screen.findByLabelText('App Secret'), 'not-a-secret')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(saveConfigMock).not.toHaveBeenCalled()
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

  it('refetches the config after saving (the channel may turn active)', async () => {
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText('Webhook Url')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await vi.waitFor(() => expect(getConfigMock).toHaveBeenCalledTimes(2))
  })

  describe('pending channel (WhatsApp skipped in the setup)', () => {
    beforeEach(() => {
      getConfigMock.mockResolvedValue(pendingConfig)
    })

    it('shows the verify token generated by the API', async () => {
      renderForm()

      const input = await screen.findByLabelText('Verify Token')
      await waitFor(() =>
        expect(input).toHaveValue(pendingConfig.webhookVerifyToken)
      )
    })

    it("prefills the webhook domain with this API's URL, still editable", async () => {
      const user = userEvent.setup()
      renderForm()

      const input = await screen.findByLabelText('Webhook Url')
      await waitFor(() => expect(input).toHaveValue(API_URL))

      await user.clear(input)
      await user.type(input, 'https://abc.ngrok-free.app')
      expect(input).toHaveValue('https://abc.ngrok-free.app')
    })

    it('explains what activates the channel', async () => {
      renderForm()

      expect(await screen.findByText(/Canal pendiente/)).toBeInTheDocument()
    })
  })

  describe('Test button', () => {
    const clickTest = async (user: ReturnType<typeof userEvent.setup>) => {
      await screen.findByLabelText('Webhook Url')
      await user.click(screen.getByRole('button', { name: /^test$/i }))
    }

    it('reports a working connection with one success toast', async () => {
      const user = userEvent.setup()
      renderForm()

      await clickTest(user)

      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
      expect(testConnectionMock).toHaveBeenCalledTimes(1)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('shows one error toast for the run, listing every failing check', async () => {
      const user = userEvent.setup()
      testConnectionMock.mockResolvedValue({
        ok: false,
        sending: { status: 'failed', message: 'Token caducado.' },
        webhook: { status: 'failed', message: 'ngrok caído.', url: FULL_URL },
        subscription: passed('Suscripción lista.'),
      })
      renderForm()

      await clickTest(user)

      await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
      expect(toast.error).toHaveBeenCalledWith(
        'La conexión de WhatsApp tiene problemas',
        expect.objectContaining({
          id: 'whatsapp:test',
          description: 'Envío: falla. Token caducado. · Webhook: falla. ngrok caído.',
        })
      )
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('warns about the checks it could not run', async () => {
      const user = userEvent.setup()
      testConnectionMock.mockResolvedValue({
        ...allGood,
        ok: false,
        subscription: { status: 'skipped', message: 'Falta el Business ID.' },
      })
      renderForm()

      await clickTest(user)

      await vi.waitFor(() =>
        expect(toast.warning).toHaveBeenCalledWith(
          'No se pudo comprobar todo',
          expect.objectContaining({
            id: 'whatsapp:test',
            description: 'Suscripción en Meta: sin comprobar. Falta el Business ID.',
          })
        )
      )
    })

    it('asks to save first when the form has unsaved changes', async () => {
      const user = userEvent.setup()
      renderForm()

      const input = await screen.findByLabelText('Webhook Url')
      await user.clear(input)
      await user.type(input, 'https://otro.dev')
      await user.click(screen.getByRole('button', { name: /^test$/i }))

      expect(toast.warning).toHaveBeenCalledWith(
        'Guarda los cambios antes de probar la conexión',
        expect.objectContaining({ id: 'whatsapp:test' })
      )
      expect(testConnectionMock).not.toHaveBeenCalled()
    })

    it('tells when the test itself could not run', async () => {
      const user = userEvent.setup()
      testConnectionMock.mockRejectedValue(new AxiosError('Network Error'))
      renderForm()

      await clickTest(user)

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('No hay conexión con el servidor'),
          expect.objectContaining({ id: 'whatsapp:test' })
        )
      )
    })
  })
})
