import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { ConversationSocketEvent, SOCKET_NAMESPACES } from '@chat-crm/contracts'
import { CloudAlert } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { SOCKET_URL } from '@/lib/endpoints'
import { refreshSession } from '@/lib/http'
import { notify } from '@/lib/notify'
import { resolveErrorToast } from '@/lib/socket-taxonomy'
import { requestTemplatePicker } from '@/features/chats/lib/template-picker-request'

const RECONNECTING_TOAST_ID = 'socket:reconnecting'
const RECONNECTING_AFTER_ATTEMPTS = 3
const RECONNECTING_COPY = {
  title: 'Reconectando…',
  description: 'Se perdió la conexión en tiempo real. Lo reintentamos solos.',
} as const

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  // Keyed by the user only: one socket spans every company of the session,
  // so switching the active company never reconnects it.
  const userId = useAuthStore((state) => state.auth.user?.id)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userId) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      return
    }

    // SOCKET_URL is the server base (no namespace, see lib/endpoints); the
    // namespace comes from the shared contracts (single source with the API).
    // Identity is the `access_token` cookie only; the server joins the socket
    // to the rooms of every company in the session.
    const newSocket = io(`${SOCKET_URL}/${SOCKET_NAMESPACES.conversation}`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      // Never give up: a laptop waking up or a server restart must recover
      // on its own. Backoff grows to 30 s; the notifications replay on
      // `connect` (see `useNotificationRealtime`) fills the gap.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    })

    // Event listeners
    newSocket.on('connect', () => {
      setIsConnected(true)
      notify.dismiss(RECONNECTING_TOAST_ID)
    })

    // Only after a few failed attempts: a blip should not flash a toast.
    newSocket.io.on('reconnect_attempt', (attempt) => {
      if (attempt === RECONNECTING_AFTER_ATTEMPTS) {
        notify.warning(RECONNECTING_COPY.title, {
          id: RECONNECTING_TOAST_ID,
          description: RECONNECTING_COPY.description,
          duration: Infinity,
        })
      }
    })

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false)

      // The server drops the socket when the session memberships change (or
      // the token is stale): refresh them, then reconnect with the new rooms.
      if (reason === 'io server disconnect') {
        void refreshSession()
          .then(() => newSocket.connect())
          .catch(() => undefined)
      }
    })

    newSocket.on('event-error', () => {
      setIsConnected(false)
    })

    // Failure taxonomy: with action → persistent "Enviar plantilla" toast that
    // opens the open conversation's template picker;
    // without → detail toast. The v2 payload carries no message reference, so
    // the inline `failed` state comes from the `conversation:message:status`
    // patch (T3), never from this event.
    newSocket.on(ConversationSocketEvent.ErrorMessage, (error) => {
      const decision = resolveErrorToast(error)

      // One toast per failure kind: a burst of failed sends updates it
      // instead of stacking copies.
      if (decision.kind === 'template') {
        notify.critical(decision.title, {
          id: 'message-error:template',
          description: decision.description,
          action: {
            label: 'Enviar plantilla',
            onClick: requestTemplatePicker,
          },
        })
        return
      }

      notify.error(decision.title, {
        id: `message-error:${decision.title}`,
        description: decision.description,
        icon: <CloudAlert />,
      })
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.close()
      socketRef.current = null
      notify.dismiss(RECONNECTING_TOAST_ID)
    }
  }, [userId])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
