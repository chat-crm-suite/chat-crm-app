import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSocket } from '@/test/fake-socket'
import { ChatsProvider, useChats } from '../contexts/chats.provider'
import type { ChatSentiment } from '../types/chat.domain'
import { ChatSocketEvents } from '../types/socket.api'
import { useConversationSentiment } from './use-conversation-sentiment'

const mocks = vi.hoisted(() => ({
  useSocket: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/context/socket-provider', () => ({ useSocket: mocks.useSocket }))
vi.mock('@/lib/http', () => ({ client: () => ({ get: mocks.get }) }))

/** Probe: observes the tone exactly as the chats surface sees it. */
function ToneProbe() {
  const { sentimentData } = useChats()

  return (
    <span data-testid='tone'>
      {sentimentData
        ? `${sentimentData.dominant}:${sentimentData.totalMessages}`
        : 'none'}
    </span>
  )
}

function OpenConversation({ id }: { id: string }) {
  useConversationSentiment(id)

  return <ToneProbe />
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ChatsProvider>{children}</ChatsProvider>
      </QueryClientProvider>
    ),
  }
}

const sentiment = (overrides: Partial<ChatSentiment> = {}): ChatSentiment => ({
  ...baseSentiment(),
  ...overrides,
})

function baseSentiment(): ChatSentiment {
  return {
    avgPos: 0.52,
    avgNeu: 0.31,
    avgNeg: 0.17,
    totalMessages: 48,
    dominant: 'POS',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe('useConversationSentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue({ data: baseSentiment() })
  })

  it('loads the tone of the open conversation into the chats context', async () => {
    const { socket } = createFakeSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper } = createWrapper()

    render(<OpenConversation id='c-1' />, { wrapper })

    await screen.findByText('POS:48')
    expect(mocks.get).toHaveBeenCalledWith('/c-1/sentiment')
  })

  it('refetches the tone when a live sentiment update arrives', async () => {
    const { socket, fire } = createFakeSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    mocks.get
      .mockResolvedValueOnce({ data: sentiment() })
      .mockResolvedValueOnce({
        data: sentiment({
          avgPos: 0.1,
          avgNeu: 0.2,
          avgNeg: 0.7,
          totalMessages: 49,
          dominant: 'NEG',
        }),
      })
    const { wrapper } = createWrapper()

    render(<OpenConversation id='c-1' />, { wrapper })
    await screen.findByText('POS:48')

    act(() => {
      fire(ChatSocketEvents.sentimentIndicator, {
        pos: 0.1,
        neu: 0.2,
        neg: 0.7,
      })
    })

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    })
    await screen.findByText('NEG:49')
  })

  it('clears the previous tone when the user switches conversation', async () => {
    const { socket } = createFakeSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const nextTone = deferred<ChatSentiment>()
    mocks.get.mockImplementation((path: string) =>
      path === '/c-1/sentiment'
        ? Promise.resolve({ data: sentiment() })
        : nextTone.promise.then((data) => ({ data }))
    )
    const { wrapper } = createWrapper()

    const { rerender } = render(<OpenConversation id='c-1' />, { wrapper })
    await screen.findByText('POS:48')

    rerender(<OpenConversation id='c-2' />)

    await waitFor(() =>
      expect(screen.getByTestId('tone')).toHaveTextContent('none')
    )
    expect(mocks.get).toHaveBeenCalledWith('/c-2/sentiment')

    act(() => {
      nextTone.resolve(
        sentiment({
          avgPos: 0.1,
          avgNeu: 0.2,
          avgNeg: 0.7,
          totalMessages: 49,
          dominant: 'NEG',
        })
      )
    })
    await screen.findByText('NEG:49')
  })
})
