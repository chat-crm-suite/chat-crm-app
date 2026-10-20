import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatsProvider } from '../../contexts/chats.provider'
import type { ChatListView } from '../../types/chat.domain'
import { ChatListHeader } from './chat-list-header'

vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: null, isConnected: true }),
}))

const renderHeader = (
  options: {
    search?: string
    view?: ChatListView
    views?: ChatListView[]
    counts?: Partial<Record<ChatListView, number | undefined>>
  } = {}
) => {
  const setSearch = vi.fn()
  const setView = vi.fn()

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <ChatsProvider>{children}</ChatsProvider>
    </QueryClientProvider>
  )
  render(
    <ChatListHeader
      searchState={{ search: options.search ?? '', setSearch }}
      viewState={{ view: options.view ?? 'mine', setView }}
      views={options.views ?? ['mine', 'queue', 'needs']}
      counts={options.counts ?? { mine: 24, queue: 8, needs: 12 }}
    />,
    { wrapper }
  )

  return { setSearch, setView }
}

describe('ChatListHeader', () => {
  it('shows a count per view only when the view has chats', () => {
    renderHeader({ counts: { mine: 24, queue: 0, needs: undefined } })

    expect(screen.getByRole('button', { name: /Mis chats/ })).toHaveTextContent(
      '24'
    )
    expect(screen.getByRole('button', { name: /Cola/ })).not.toHaveTextContent(
      '0'
    )
    expect(
      screen.getByRole('button', { name: /Sin resp\./ })
    ).toHaveTextContent(/^Sin resp\.$/)
  })

  it('shows the Todos tab only when the member may see every chat', () => {
    renderHeader({ views: ['mine', 'queue', 'needs', 'all'] })

    expect(screen.getByRole('button', { name: /Todos/ })).toBeInTheDocument()
  })

  it('hides the Todos tab for agents', () => {
    renderHeader()

    expect(
      screen.queryByRole('button', { name: /Todos/ })
    ).not.toBeInTheDocument()
  })

  it('switches views from the tabs', async () => {
    const { setView } = renderHeader()

    await userEvent.click(screen.getByRole('button', { name: /Cola/ }))

    expect(setView).toHaveBeenCalledWith('queue')
  })

  it('clears the search from the input affordance', async () => {
    const { setSearch } = renderHeader({ search: 'maría' })

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar búsqueda' })
    )

    expect(setSearch).toHaveBeenCalledWith('')
  })

  it('hides the clear affordance on an empty search', () => {
    renderHeader()

    expect(
      screen.queryByRole('button', { name: 'Limpiar búsqueda' })
    ).not.toBeInTheDocument()
  })

  it('offers the new chat action', () => {
    renderHeader()

    expect(
      screen.getByRole('button', { name: 'Nuevo chat' })
    ).toBeInTheDocument()
  })
})
