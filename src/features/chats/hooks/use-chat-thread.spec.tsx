import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSocket, emittedPayloads } from '@/test/fake-socket'
import { makeMessage, messageWith, readyMedia } from '../testing/messages'
import type { ChatMessage } from '../types/chat.domain'
import { ChatSocketEvents } from '../types/socket.api'
import { useChatThread } from './use-chat-thread'

const mocks = vi.hoisted(() => ({
  useSocket: vi.fn(),
  getMessages: vi.fn(),
  upload: vi.fn(),
  toast: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/context/socket-provider', () => ({ useSocket: mocks.useSocket }))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('../api', () => ({
  api: {
    queries: { messages: { get: mocks.getMessages } },
    commands: { messages: { upload: mocks.upload } },
  },
}))

const UPLOAD_ID = '0b9f6a3e-5c1d-4f7e-9a2b-3c4d5e6f7a8b'

const identity = {
  companyId: 'company-1',
  sender: { id: 'member-1', type: 'member' as const },
}

function setup(options: { connected?: boolean; history?: ChatMessage[] } = {}) {
  mocks.getMessages.mockResolvedValue(options.history ?? [])
  const fake = createFakeSocket(options.connected ?? true)
  mocks.useSocket.mockReturnValue({ socket: fake.socket, isConnected: true })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    ({ id }: { id: string }) => useChatThread(id, identity),
    { wrapper, initialProps: { id: 'c-1' } }
  )

  return {
    ...fake,
    hook,
    thread: () =>
      queryClient.getQueryData<ChatMessage[]>(['chat', 'c-1', 'messages']) ?? [],
    sends: () => emittedPayloads(fake.socket, ChatSocketEvents.sendMessage),
    loaded: () => waitFor(() => expect(mocks.getMessages).toHaveBeenCalled()),
  }
}

const photo = (name = 'foto.png') =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })

describe('useChatThread', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })
  afterAll(() => {
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.upload.mockResolvedValue({ uploadId: UPLOAD_ID })
  })

  describe('text', () => {
    it('shows the message as pending at once and sends it with a client id', async () => {
      const t = setup()
      await t.loaded()

      act(() => t.hook.result.current.send({ type: 'text', text: 'Hola Rosa' }))

      expect(t.thread()[0]).toMatchObject({
        status: 'pending',
        sender: { id: 'member-1', type: 'member' },
        msg: { type: 'text', text: 'Hola Rosa' },
      })
      await waitFor(() => expect(t.sends()).toHaveLength(1))
      expect(t.sends()[0]).toEqual({
        room: 'c-1',
        companyId: 'company-1',
        clientMessageId: t.thread()[0].clientMessageId,
        msg: { type: 'text', text: 'Hola Rosa' },
      })
    })

    it('reconciles the saved broadcast with the optimistic row', async () => {
      const t = setup()
      await t.loaded()
      act(() => t.hook.result.current.send({ type: 'text', text: 'Hola' }))
      const clientMessageId = t.thread()[0].clientMessageId

      act(() =>
        t.fire(
          ChatSocketEvents.broadcast,
          makeMessage({
            id: 'server-1',
            clientMessageId,
            status: 'pending',
            sender: { id: 'member-1', type: 'member' },
          })
        )
      )

      expect(t.thread()).toHaveLength(1)
      expect(t.thread()[0].id).toBe('server-1')
    })
  })

  describe('acknowledgement', () => {
    it('fails the row at once when the API refuses the send', async () => {
      const t = setup()
      t.setAck(() =>
        Promise.resolve({ ok: false, code: 'forbidden', message: 'denied' })
      )
      await t.loaded()

      act(() => t.hook.result.current.send({ type: 'text', text: 'Hola' }))

      await waitFor(() => expect(t.thread()[0].status).toBe('failed'))
      expect(mocks.toast.error).toHaveBeenCalledWith('No se pudo enviar el mensaje', {
        description: 'Ya no tienes acceso a esta conversación.',
      })
    })

    it('fails the row when the acknowledgement never comes', async () => {
      const t = setup()
      t.setAck(() => Promise.reject(new Error('operation has timed out')))
      await t.loaded()

      act(() => t.hook.result.current.send({ type: 'text', text: 'Hola' }))

      await waitFor(() => expect(t.thread()[0].status).toBe('failed'))
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'No se pudo enviar el mensaje',
        expect.objectContaining({ description: expect.stringContaining('Sin respuesta') as string })
      )
    })
  })

  describe('files', () => {
    it('uploads, shows progress on the local preview and sends by uploadId', async () => {
      const t = setup()
      let reportProgress: (progress: number) => void = () => {}
      let finish: (value: { uploadId: string }) => void = () => {}
      mocks.upload.mockImplementation(
        (_id, _file, options: { onProgress: (progress: number) => void }) => {
          reportProgress = options.onProgress
          return new Promise((resolve) => (finish = resolve))
        }
      )
      await t.loaded()
      const file = photo()

      act(() =>
        t.hook.result.current.send({ type: 'image', file, caption: 'Mira', width: 2, height: 1 })
      )

      expect(t.thread()[0]).toMatchObject({
        status: 'pending',
        msg: {
          type: 'image',
          caption: 'Mira',
          media: { status: 'pending', width: 2, height: 1, mimeType: 'image/png' },
        },
        local: { previewUrl: 'blob:preview', progress: 0 },
      })
      expect(mocks.upload).toHaveBeenCalledWith(
        'c-1',
        { file, kind: 'image', durationMs: undefined },
        expect.any(Object)
      )

      act(() => reportProgress(0.5))
      expect(t.thread()[0].local?.progress).toBe(0.5)
      expect(t.sends()).toHaveLength(0)

      await act(async () => finish({ uploadId: UPLOAD_ID }))
      await waitFor(() => expect(t.sends()).toHaveLength(1))
      expect(t.sends()[0]).toMatchObject({
        msg: { type: 'image', uploadId: UPLOAD_ID, caption: 'Mira' },
      })
    })

    it('uploads in parallel but sends in the order they were asked', async () => {
      const t = setup()
      const finishers = new Map<string, (value: { uploadId: string }) => void>()
      mocks.upload.mockImplementation(
        (_id, upload: { file: File }) =>
          new Promise((resolve) => finishers.set(upload.file.name, resolve))
      )
      await t.loaded()

      act(() => {
        t.hook.result.current.send({ type: 'image', file: photo('1.png') })
        t.hook.result.current.send({ type: 'image', file: photo('2.png') })
      })
      expect(mocks.upload).toHaveBeenCalledTimes(2)

      // The second file finishes first; it still leaves second.
      await act(async () => finishers.get('2.png')?.({ uploadId: '2b9f6a3e-5c1d-4f7e-9a2b-3c4d5e6f7a8b' }))
      await act(async () => finishers.get('1.png')?.({ uploadId: UPLOAD_ID }))

      await waitFor(() => expect(t.sends()).toHaveLength(2))
      expect(t.sends().map((payload) => (payload as { msg: { uploadId: string } }).msg.uploadId)).toEqual([
        UPLOAD_ID,
        '2b9f6a3e-5c1d-4f7e-9a2b-3c4d5e6f7a8b',
      ])
    })

    it('fails the row with the API reason when the upload is refused', async () => {
      const t = setup()
      mocks.upload.mockRejectedValue(new Error('El video supera 16 MB'))
      await t.loaded()

      act(() => t.hook.result.current.send({ type: 'video', file: photo('v.mp4') }))

      await waitFor(() => expect(t.thread()[0].status).toBe('failed'))
      expect(t.sends()).toHaveLength(0)
    })

    it('retries without uploading the file again', async () => {
      const t = setup()
      t.setAck(() => Promise.resolve({ ok: false, code: 'internal', message: 'x' }))
      await t.loaded()

      act(() => t.hook.result.current.send({ type: 'document', file: photo('a.pdf') }))
      await waitFor(() => expect(t.thread()[0].status).toBe('failed'))

      t.setAck(() => Promise.resolve({ ok: true }))
      act(() => t.hook.result.current.retry(t.thread()[0]))

      await waitFor(() => expect(t.sends()).toHaveLength(2))
      expect(mocks.upload).toHaveBeenCalledTimes(1)
      expect(t.sends()[1]).toEqual(t.sends()[0])
      expect(t.thread()[0].status).toBe('pending')
    })
  })

  describe('retry from history', () => {
    it('rebuilds a text send with its original client id', async () => {
      const t = setup({
        history: [
          makeMessage({
            id: 'server-7',
            clientMessageId: 'client-7',
            status: 'failed',
            sender: { id: 'member-1', type: 'member' },
            msg: { type: 'text', text: 'Hola de ayer' },
          }),
        ],
      })
      await waitFor(() => expect(t.thread()).toHaveLength(1))

      act(() => t.hook.result.current.retry(t.thread()[0]))

      await waitFor(() => expect(t.sends()).toHaveLength(1))
      expect(t.sends()[0]).toEqual({
        room: 'c-1',
        companyId: 'company-1',
        clientMessageId: 'client-7',
        msg: { type: 'text', text: 'Hola de ayer' },
      })
    })

    it('asks to attach the file again for a media row it no longer holds', async () => {
      const t = setup({
        history: [
          messageWith(
            { type: 'image', media: readyMedia(), caption: null },
            { id: 'server-8', clientMessageId: 'client-8', status: 'failed', sender: { id: 'member-1', type: 'member' } }
          ),
        ],
      })
      await waitFor(() => expect(t.thread()).toHaveLength(1))

      act(() => t.hook.result.current.retry(t.thread()[0]))

      expect(mocks.toast.info).toHaveBeenCalledWith('Vuelve a adjuntar el archivo para reenviarlo.')
      expect(t.sends()).toHaveLength(0)
    })
  })

  describe('live patches', () => {
    it('advances ticks and publishes attachments of this conversation only', async () => {
      const t = setup({
        history: [
          messageWith(
            { type: 'image', media: readyMedia({ status: 'pending', url: null }), caption: null },
            { id: 'server-2', status: 'pending', sender: { id: 'member-1', type: 'member' } }
          ),
        ],
      })
      await waitFor(() => expect(t.thread()).toHaveLength(1))
      const status = (conversationId: string) => ({
        id: 'server-2',
        conversationId,
        clientMessageId: null,
        status: 'sent',
        at: new Date(),
      })

      act(() => t.fire(ChatSocketEvents.messageStatus, status('c-2')))
      expect(t.thread()[0].status).toBe('pending')

      act(() => t.fire(ChatSocketEvents.messageStatus, status('c-1')))
      act(() =>
        t.fire(ChatSocketEvents.messageAttachment, {
          id: 'server-2',
          conversationId: 'c-1',
          attachmentId: 'att-1',
          status: 'ready',
          url: '/attachments/att-1',
          at: new Date(),
        })
      )

      expect(t.thread()[0].status).toBe('sent')
      expect(t.thread()[0].msg).toMatchObject({
        media: { status: 'ready', url: '/attachments/att-1' },
      })
    })
  })

  describe('room membership', () => {
    it('joins on open, rejoins after a reconnect and follows a switch', async () => {
      const t = setup()
      const joins = () =>
        t.socket.emit.mock.calls.filter(([event]) => event === ChatSocketEvents.join)

      await waitFor(() =>
        expect(t.socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
          room: 'c-1',
          companyId: 'company-1',
        })
      )

      act(() => t.fire('connect'))
      expect(joins()).toHaveLength(2)

      t.hook.rerender({ id: 'c-2' })
      await waitFor(() =>
        expect(t.socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
          room: 'c-2',
          companyId: 'company-1',
        })
      )
    })

    it('joins once the socket connects after opening offline', () => {
      const t = setup({ connected: false })

      expect(t.socket.emit).not.toHaveBeenCalled()
      act(() => t.fire('connect'))

      expect(t.socket.emit).toHaveBeenCalledWith(ChatSocketEvents.join, {
        room: 'c-1',
        companyId: 'company-1',
      })
    })
  })
})
