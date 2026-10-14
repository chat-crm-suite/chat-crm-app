import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResolveCaseButton } from './resolve-case-button'

const api = vi.hoisted(() => ({
  getCurrentCase: vi.fn(),
  closeCase: vi.fn(),
}))

vi.mock('@/services/chat.service', () => api)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const openCase = {
  id: 'case-1',
  conversationId: 'conv-1',
  status: 'open' as const,
  openedAt: new Date('2026-10-14T10:00:00Z'),
  firstResponseAt: null,
  firstResponderMemberId: null,
  closedAt: null,
  closedByMemberId: null,
  reopenOfCaseId: null,
}

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<ResolveCaseButton conversationId='conv-1' />, { wrapper })
}

describe('ResolveCaseButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stays disabled when the conversation has no open case', async () => {
    api.getCurrentCase.mockResolvedValue({
      case: { ...openCase, status: 'closed' },
    })
    renderButton()

    expect(
      await screen.findByRole('button', {
        name: 'No hay un caso abierto en esta conversación',
      })
    ).toBeDisabled()
  })

  it('resolves the open case with the optional note', async () => {
    const user = userEvent.setup()
    api.getCurrentCase.mockResolvedValue({ case: openCase })
    api.closeCase.mockResolvedValue({ ...openCase, status: 'closed' })
    renderButton()

    await user.click(await screen.findByRole('button', { name: 'Resolver' }))
    await user.type(
      screen.getByLabelText('Nota interna (opcional)'),
      'Pedido entregado'
    )
    await user.click(screen.getByRole('button', { name: 'Resolver caso' }))

    await waitFor(() =>
      expect(api.closeCase).toHaveBeenCalledWith('conv-1', {
        note: 'Pedido entregado',
      })
    )
  })
})
