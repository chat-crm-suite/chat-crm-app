import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sendTemplate } from '@/services/whatsapp.service'
import { ConversationSocketEvent, SOCKET_NAMESPACES } from '@chat-crm/contracts'
import { CloudAlert } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  notificationToastPayload,
  prependNotification,
  resolveErrorToast,
} from '@/lib/socket-taxonomy'

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
  const { user, company } = useAuthStore((state) => state.auth)
  const [_unreadCount, setUnreadCount] = useState(0)
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const originalTitleRef = useRef(document.title)

  // Browser notification permission is requested from an effect, never during
  // render (requesting it while rendering side-effects React's render phase).
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      return
    }

    // VITE_SOCKET_URL is the server base URL (no namespace); the namespace
    // comes from the shared contracts (single source of truth with the API).
    const socketBaseUrl = (
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
    ).replace(/\/+$/, '')
    const newSocket = io(`${socketBaseUrl}/${SOCKET_NAMESPACES.conversation}`, {
      auth: {
        user,
        companyId: company.id,
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // Event listeners
    newSocket.on('connect', () => {
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Single `notification:new` handler: browser notification + sound + title
    // counter + bell cache + one toast. This is the only place that reacts to
    // the event (T6): do not add a second listener elsewhere.
    newSocket.on(ConversationSocketEvent.NewNotification, (notification) => {
      const { title, body } = notificationToastPayload(notification)

      setUnreadCount((previous) => {
        const next = previous + 1
        document.title = `(${next}) Nuevo mensaje - MiApp`
        return next
      })

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, { body: body ?? 'Vista no disponible' })
      }

      queryClient.setQueryData(['notifications'], (previous: unknown) =>
        prependNotification(previous, notification)
      )

      const audio = new Audio('/sounds/alert.mp3')
      void audio.play().catch(() => undefined)

      toast.info(title, { position: 'top-right', description: body })
    })

    newSocket.on('event-error', () => {
      setIsConnected(false)
    })

    // Failure taxonomy: with action → persistent "Enviar plantilla" toast;
    // without → detail toast. The v2 payload carries no message reference, so
    // the inline `failed` state comes from the `conversation:message:status`
    // patch (T3), never from this event.
    newSocket.on(ConversationSocketEvent.ErrorMessage, (error) => {
      const decision = resolveErrorToast(error)

      if (decision.kind === 'template') {
        toast.error(decision.title, {
          position: 'top-right',
          description: decision.description,
          action: {
            label: 'Enviar plantilla',
            onClick: () => void sendTemplate(decision.recipient ?? ''),
          },
          closeButton: true,
          duration: Infinity,
        })
        return
      }

      toast(decision.title, {
        position: 'top-right',
        description: decision.description,
        icon: <CloudAlert />,
      })
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.close()
      socketRef.current = null
    }
  }, [user, company.id, queryClient])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setUnreadCount(0)
        document.title = originalTitleRef.current
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
