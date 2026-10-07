import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSocket, emittedPayloads } from '@/test/fake-socket'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents } from '../types/socket.api'
import { useChatThread } from './use-chat-thread'

const mocks = vi.hoisted(() => ({
  useSocket: vi.fn(),
  getMessages: vi.fn(),
}))

vi.mock('@/context/socket-provider', () => ({ useSocket: mocks.useSocket }))
vi.mock('../api', () => ({
  api: { queries: { messages: { get: mocks.getMessages } } },
}))

const identity = {
  companyId: 'company-1',
  sender: { id: 'member-1', type: 'member' as const },
  to: '+51999888777',
}

/** Shared fake socket plus this suite's send-payload probe. */
function createThreadSocket(connected = true) {
  const { socket, fire } = createFakeSocket(connected)

  return {
    socket,
    fire,
    sentPayloads: () => emittedPayloads(socket, ChatSocketEvents.sendMessage),
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

const thread = (queryClient: QueryClient) =>
  queryClient.getQueryData<ChatMessage[]>(['chat', 'c-1', 'messages']) ?? []

const historyMessage: ChatMessage = {
  id: 'server-1',
  conversationId: 'c-1',
  timestamp: new Date('2026-10-06T09:00:00'),
  status: 'pending',
  sender: { id: 'member-1', type: 'member' },
  msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
}

const historyImage: ChatMessage = {
  id: 'server-2',
  conversationId: 'c-1',
  timestamp: new Date('2026-10-06T09:01:00'),
  status: 'delivered',
  sender: { id: 'customer-1', type: 'customer' },
  msg: {
    type: 'image',
    mediaUrl: null,
    attachmentStatus: 'pending',
    content: { caption: 'foto' },
  },
}

const historyFailed: ChatMessage = {
  id: 'server-7',
  conversationId: 'c-1',
  clientMessageId: 'client-7',
  timestamp: new Date('2026-10-05T18:00:00'),
  status: 'failed',
  sender: { id: 'member-1', type: 'member' },
  msg: { type: 'text', mediaUrl: null, content: { body: 'Hola de ayer' } },
}

describe('useChatThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getMessages.mockResolvedValue([])
  })

  it('shows the sent message as pending immediately and emits it with a client id', async () => {
    const { socket } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useChatThread('c-1', identity), {
      wrapper,
    })
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith('c-1'))

    act(() => result.current.send('Hola Rosa'))

    const messages = thread(queryClient)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      conversationId: 'c-1',
      status: 'pending',
      sender: { id: 'member-1', type: 'member' },
      msg: { type: 'text', content: { body: 'Hola Rosa' } },
    })
    expect(messages[0].clientMessageId).toBeTruthy()

    expect(socket.emit).toHaveBeenCalledWith(
      ChatSocketEvents.sendMessage,
      expect.objectContaining({
        room: 'c-1',
        companyId: 'company-1',
        clientMessageId: messages[0].clientMessageId,
        to: '+51999888777',
        sender: { id: 'member-1', type: 'member' },
        msg: { type: 'text', content: { body: 'Hola Rosa' } },
      })
    )
  })

  it('reconciles the saved broadcast with the optimistic row without duplicating it', async () => {
    const { socket, fire } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useChatThread('c-1', identity), {
      wrapper,
    })
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith('c-1'))

    act(() => result.current.send('Hola Rosa'))
    const clientMessageId = thread(queryClient)[0].clientMessageId

    act(() => {
      fire(ChatSocketEvents.broadcast, {
        id: 'server-1',
        conversationId: 'c-1',
        clientMessageId,
        timestamp: new Date('2026-10-06T09:00:01'),
        status: 'pending',
        sender: { id: 'member-1', type: 'member' },
        msg: { type: 'text', mediaUrl: null, content: { body: 'Hola Rosa' } },
      } satisfies ChatMessage)
    })

    const messages = thread(queryClient)
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe('server-1')
    expect(messages[0].clientMessageId).toBe(clientMessageId)
  })

  it('advances the delivery tick from a live status patch', async () => {
    mocks.getMessages.mockResolvedValue([historyMessage])
    const { socket, fire } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    renderHook(() => useChatThread('c-1', identity), { wrapper })
    await waitFor(() => expect(thread(queryClient)).toHaveLength(1))

    act(() => {
      fire(ChatSocketEvents.messageStatus, {
        id: 'server-1',
        conversationId: 'c-1',
        clientMessageId: null,
        status: 'sent',
        at: new Date('2026-10-06T09:00:02'),
      })
    })

    expect(thread(queryClient)[0].status).toBe('sent')
  })

  it('applies a live attachment patch without reloading', async () => {
    mocks.getMessages.mockResolvedValue([historyImage])
    const { socket, fire } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    renderHook(() => useChatThread('c-1', identity), { wrapper })
    await waitFor(() => expect(thread(queryClient)).toHaveLength(1))

    act(() => {
      fire(ChatSocketEvents.messageAttachment, {
        id: 'server-2',
        conversationId: 'c-1',
        attachmentId: 'att-1',
        status: 'ready',
        url: '/uploads/photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1234,
        at: new Date('2026-10-06T09:01:02'),
      })
    })

    expect(thread(queryClient)[0].msg.mediaUrl).toBe('/uploads/photo.jpg')
    expect(thread(queryClient)[0].msg.attachmentStatus).toBe('ready')
    expect(thread(queryClient)[0].msg.mimeType).toBe('image/jpeg')
    expect(thread(queryClient)[0].msg.sizeBytes).toBe(1234)
  })

  it('ignores live patches from another conversation', async () => {
    mocks.getMessages.mockResolvedValue([historyMessage])
    const { socket, fire } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    renderHook(() => useChatThread('c-1', identity), { wrapper })
    await waitFor(() => expect(thread(queryClient)).toHaveLength(1))

    act(() => {
      fire(ChatSocketEvents.messageStatus, {
        id: 'server-1',
        conversationId: 'c-2',
        clientMessageId: null,
        status: 'read',
        at: new Date('2026-10-06T09:00:02'),
      })
    })

    expect(thread(queryClient)[0].status).toBe('pending')
  })

  it('retries a failed send with the same client id and the stored payload', async () => {
    const { socket, fire, sentPayloads } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useChatThread('c-1', identity), {
      wrapper,
    })
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith('c-1'))

    act(() => result.current.send('Hola Rosa'))
    const [payload] = sentPayloads()
    const clientMessageId = thread(queryClient)[0].clientMessageId

    act(() => {
      fire(ChatSocketEvents.messageStatus, {
        id: 'server-1',
        conversationId: 'c-1',
        clientMessageId,
        status: 'failed',
        at: new Date('2026-10-06T09:00:02'),
      })
    })
    expect(thread(queryClient)[0].status).toBe('failed')

    act(() => result.current.retry(thread(queryClient)[0]))

    expect(sentPayloads()).toHaveLength(2)
    expect(sentPayloads()[1]).toBe(payload)
    expect(thread(queryClient)[0].status).toBe('pending')

    // Retrying again reuses the same id: the thread still holds one row.
    act(() => result.current.retry(thread(queryClient)[0]))
    expect(thread(queryClient)).toHaveLength(1)
    expect(sentPayloads()[2]).toBe(payload)
  })

  it('retries a failed message loaded from history with the same client id', async () => {
    mocks.getMessages.mockResolvedValue([historyFailed])
    const { socket, sentPayloads } = createThreadSocket()
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useChatThread('c-1', identity), {
      wrapper,
    })
    await waitFor(() => expect(thread(queryClient)).toHaveLength(1))

    act(() => result.current.retry(thread(queryClient)[0]))

    expect(sentPayloads()).toHaveLength(1)
    expect(sentPayloads()[0]).toMatchObject({
      room: 'c-1',
      companyId: 'company-1',
      clientMessageId: 'client-7',
      to: '+51999888777',
      sender: { id: 'member-1', type: 'member' },
      msg: { type: 'text', content: { body: 'Hola de ayer' } },
    })
    expect(thread(queryClient)[0].status).toBe('pending')
  })

  it('joins the conversation room on open and rejoins after a reconnect', async () => {
    const { socket, fire } = createThreadSocket(true)
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper } = createWrapper()

    renderHook(() => useChatThread('c-1', identity), { wrapper })

    await waitFor(() =>
      expect(socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
        room: 'c-1',
      })
    )

    act(() => fire('connect'))

    const joins = socket.emit.mock.calls.filter(
      ([event]) => event === ChatSocketEvents.join
    )
    expect(joins).toHaveLength(2)
  })

  it('joins the room once the socket connects after opening offline', async () => {
    const { socket, fire } = createThreadSocket(false)
    mocks.useSocket.mockReturnValue({ socket, isConnected: false })
    const { wrapper } = createWrapper()

    renderHook(() => useChatThread('c-1', identity), { wrapper })

    expect(socket.emit).not.toHaveBeenCalledWith(ChatSocketEvents.join, {
      room: 'c-1',
    })

    act(() => fire('connect'))

    expect(socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
      room: 'c-1',
    })
  })

  it('joins the newly opened conversation room when the user switches', async () => {
    const { socket } = createThreadSocket(true)
    mocks.useSocket.mockReturnValue({ socket, isConnected: true })
    const { wrapper } = createWrapper()

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useChatThread(id, identity),
      { wrapper, initialProps: { id: 'c-1' } }
    )

    await waitFor(() =>
      expect(socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
        room: 'c-1',
      })
    )

    rerender({ id: 'c-2' })

    await waitFor(() =>
      expect(socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
        room: 'c-2',
      })
    )
  })
})
