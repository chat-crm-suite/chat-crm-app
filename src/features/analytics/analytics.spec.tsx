import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MemberRole } from '@chat-crm/contracts'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { Analytics } from '.'
import {
  agentsPerformance,
  emptyLiveSnapshot,
  iaActive,
  iaDisabled,
  iaDown,
  insufficientControl,
  liveSnapshot,
  myPerformance,
  NOW,
  readiness,
  staffing,
} from './testing/fixtures'

const api = vi.hoisted(() => ({
  getLiveSnapshot: vi.fn(),
  getReadiness: vi.fn(),
  getMyPerformance: vi.fn(),
  getAgentsPerformance: vi.fn(),
  getAgentControl: vi.fn(),
  getStaffing: vi.fn(),
  getVolume: vi.fn(),
  getDelivery: vi.fn(),
  getSentimentAnalytics: vi.fn(),
  downloadPerformanceCsv: vi.fn(),
  getIaStatus: vi.fn(),
  toggleIa: vi.fn(),
  getMyPresence: vi.fn(),
  updatePresence: vi.fn(),
}))

vi.mock('./clients/analytics.client', () => api)
vi.mock('./clients/ia.client', () => ({
  getIaStatus: api.getIaStatus,
  toggleIa: api.toggleIa,
}))
vi.mock('./clients/presence.client', () => ({
  getMyPresence: api.getMyPresence,
  updatePresence: api.updatePresence,
}))
vi.mock('./clients/spend.client', () => ({
  getSpendSummary: vi.fn(),
  updateChannelRates: vi.fn(),
  updateBudget: vi.fn(),
  setBillablePause: vi.fn(),
}))
vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: null, isConnected: true }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))
// Page chrome needs sidebar/theme providers that are irrelevant here.
vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
}))
vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('@/components/search', () => ({ Search: () => null }))
vi.mock('@/components/notifications-bell', () => ({
  NotificationBell: () => null,
}))
vi.mock('@/components/theme-switch', () => ({ ThemeSwitch: () => null }))
vi.mock('@/components/config-drawer', () => ({ ConfigDrawer: () => null }))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => null,
}))

function signInAs(role: MemberRole) {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      company: { id: 'company-a' },
      user: {
        id: 'user-1',
        username: 'carla',
        isPlatformAdmin: false,
        memberships: [
          {
            id: 'member-1',
            companyId: 'company-a',
            companyName: 'Acme',
            role,
            status: 'active',
          },
        ],
      } as never,
    },
  }))
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Analytics />
    </QueryClientProvider>
  )
}

describe('Analytics page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    api.getReadiness.mockResolvedValue(readiness())
    api.getIaStatus.mockResolvedValue(iaActive)
    api.getMyPresence.mockResolvedValue({
      memberId: 'member-1',
      state: 'available',
      since: NOW,
    })
    api.getLiveSnapshot.mockResolvedValue(liveSnapshot())
    api.getMyPerformance.mockResolvedValue(myPerformance())
    api.getAgentsPerformance.mockResolvedValue(agentsPerformance())
    api.getStaffing.mockResolvedValue(staffing())
    api.getSentimentAnalytics.mockResolvedValue({
      range: myPerformance().range,
      scope: 'me',
      days: [{ date: '2026-10-14', positive: 6, neutral: 3, negative: 1 }],
      share: { positive: 0.6, neutral: 0.3, negative: 0.1 },
      negativeControl: insufficientControl(),
      meta: { status: 'ok', sampleSize: 10, minimumSample: 1 },
    })
  })

  it('gives agents their desk: own waiting customers, no other agent names', async () => {
    signInAs('agent')
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Mi turno' })
    ).toBeInTheDocument()
    const waiting = screen.getByRole('region', { name: 'Te esperan ahora' })
    expect(await within(waiting).findByText('Ana Rojas')).toBeInTheDocument()
    // The unassigned customer is offered through the queue line, not as a row.
    expect(within(waiting).queryByText('Luis Pérez')).not.toBeInTheDocument()
    expect(
      within(waiting).getByRole('button', { name: 'Tomar el siguiente' })
    ).toBeEnabled()
    expect(
      screen.queryByRole('tab', { name: 'Gasto por canal' })
    ).not.toBeInTheDocument()
  })

  it('gives supervisors operations and performance, without spend or system', async () => {
    signInAs('supervisor')
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Piso en vivo' })
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Operación' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Rendimiento' })).toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Gasto por canal' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Sistema' })
    ).not.toBeInTheDocument()
  })

  it('gives admins channel spend and system status too', async () => {
    signInAs('admin')
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Empresa' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Gasto por canal' })
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sistema' })).toBeInTheDocument()
  })

  it('shows the welcome checklist on a fresh install instead of empty charts', async () => {
    signInAs('admin')
    api.getReadiness.mockResolvedValue(
      readiness({
        isEmpty: true,
        firstMessageReceived: false,
        businessHoursConfigured: false,
        activeDays: 0,
      })
    )
    api.getLiveSnapshot.mockResolvedValue(emptyLiveSnapshot())
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no hay actividad para medir',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Recibir el primer mensaje')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Configurar horario' })
    ).toHaveAttribute('href', '/settings/service')
    expect(
      screen.queryByRole('tab', { name: 'Operación' })
    ).not.toBeInTheDocument()
  })

  it('says what is missing when a chart has too few days', async () => {
    signInAs('agent')
    api.getMyPerformance.mockResolvedValue(
      myPerformance({ firstResponseControl: insufficientControl() })
    )
    renderPage()

    expect(
      await screen.findByText(
        'Faltan 5 días de datos para el gráfico de control.'
      )
    ).toBeInTheDocument()
  })

  it.each([
    ['disabled', iaDisabled, 'está desactivado'],
    ['down', iaDown, 'no está disponible'],
  ])(
    'hides every tone metric while the IA is %s',
    async (_label, status, copy) => {
      signInAs('agent')
      api.getIaStatus.mockResolvedValue(status)
      renderPage()

      expect(await screen.findByText(new RegExp(copy))).toBeInTheDocument()
      await screen.findByText('Ana Rojas')
      expect(
        screen.queryByRole('region', { name: 'Tono de mis clientes' })
      ).not.toBeInTheDocument()
      expect(api.getSentimentAnalytics).not.toHaveBeenCalled()
    }
  )

  it('shows tone metrics while the IA is active', async () => {
    signInAs('agent')
    renderPage()

    expect(
      await screen.findByRole('region', { name: 'Tono de mis clientes' })
    ).toBeInTheDocument()
    expect(
      await screen.findByText('10 mensajes analizados')
    ).toBeInTheDocument()
  })

  it('isolates a failing widget: it offers a retry while the rest keeps working', async () => {
    signInAs('supervisor')
    api.getStaffing.mockRejectedValue(new Error('boom'))
    renderPage()

    expect(
      await screen.findByText('No se pudo cargar «Personal necesario».')
    ).toBeInTheDocument()
    const waiting = screen.getByRole('region', { name: 'Clientes esperando' })
    expect(await within(waiting).findByText('Ana Rojas')).toBeInTheDocument()

    api.getStaffing.mockResolvedValue(staffing())
    const staffingRegion = screen.getByRole('region', {
      name: 'Personal necesario',
    })
    await userEvent.click(
      within(staffingRegion).getByRole('button', { name: 'Reintentar' })
    )
    expect(
      await within(staffingRegion).findByText('faltan 1')
    ).toBeInTheDocument()
  })
})
