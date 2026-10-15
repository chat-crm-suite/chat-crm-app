import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: null, isConnected: true }),
}))

import type { ChatListView } from '../../types/chat.domain'
import { ChatsProvider } from '../../contexts/chats.provider'
import { ChatListHeader } from './chat-list-header'

const renderHeader = (
  options: {
    search?: string
    view?: ChatListView
    counts?: Record<ChatListView, number | undefined>
  } = {}
) => {
  const setSearch = vi.fn()
  const setView = vi.fn()

  render(
    <ChatsProvider>
      <ChatListHeader
        searchState={{ search: options.search ?? '', setSearch }}
        viewState={{ view: options.view ?? 'inbox', setView }}
        counts={
          options.counts ?? { inbox: 24, queue: 8, 'needs-response': 12 }
        }
      />
    </ChatsProvider>
  )

  return { setSearch, setView }
}

describe('ChatListHeader', () => {
  it('shows a count per view only when the view has chats', () => {
    renderHeader({ counts: { inbox: 24, queue: 0, 'needs-response': undefined } })

    expect(screen.getByRole('button', { name: /Inbox/ })).toHaveTextContent(
      '(24)'
    )
    expect(screen.getByRole('button', { name: /Cola/ })).not.toHaveTextContent(
      '(0)'
    )
    expect(
      screen.getByRole('button', { name: /Sin resp\./ })
    ).not.toHaveTextContent('(')
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
