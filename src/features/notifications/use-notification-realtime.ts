import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ConversationSocketEvent,
  NotificationEventSchema,
  NotificationPreferencesSchema,
  NotificationReadEventSchema,
  type NotificationItem,
  type NotificationListResponse,
  type NotificationPreferences,
} from '@chat-crm/contracts'
import { readLocalNotificationPrefs } from '@/lib/local-notification-prefs'
import { useSocket } from '@/context/socket-provider'
import { showDesktopNotification } from './desktop-notifier'
import {
  applyReadToCache,
  applyToCache,
  BELL_PAGE_SIZE,
  notificationKeys,
} from './notification-cache'
import { notificationTarget } from './notification-link'
import { showNotificationToast } from './notification-toast'
import { listNotifications } from './notifications.service'
import { getOpenConversation } from './open-conversation'
import { readConversationNotices } from './read-conversation'
import { TabCoordinator } from './tab-coordinator'
import { notificationPrefsKey } from './use-notification-preferences'
import { useActiveCompanyId, useNotifications } from './use-notifications'

const SOUND_URL = '/sounds/alert.mp3'
const DEFAULT_DESKTOP_TYPES = NotificationPreferencesSchema.parse({}).desktop

/**
 * The only listener of `notification:new|updated|read`. Mounted once in the
 * signed-in shell (inside the router, so actions can navigate):
 *
 * - every payload is validated and idempotent (upsert by id);
 * - events of another company only update that company's cache, never toast;
 * - visible tab: toast + sound; hidden tabs: one OS notification and one
 *   sound across all tabs (`TabCoordinator`);
 * - on (re)connect the list is replayed from the server, so nothing emitted
 *   while offline is lost and the badge comes back exact.
 */
export function useNotificationRealtime(): void {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const companyId = useActiveCompanyId()
  const companyRef = useRef(companyId)
  companyRef.current = companyId

  useEffect(() => {
    if (!socket) return
    const coordinator = new TabCoordinator()

    const open = (notification: NotificationItem) => {
      const target = notificationTarget(notification)
      if (!target) return
      void navigate(
        target.to === '/chats'
          ? { to: '/chats', search: target.search }
          : { to: target.to }
      )
    }

    const playSound = () => {
      if (!readLocalNotificationPrefs().sound) return
      void new Audio(SOUND_URL).play().catch(() => undefined)
    }

    const wantsDesktop = (notification: NotificationItem) => {
      const prefs = queryClient.getQueryData<NotificationPreferences>(
        notificationPrefsKey(notification.companyId)
      )
      // Prefs not loaded yet: the contract defaults decide.
      const types = prefs?.desktop ?? DEFAULT_DESKTOP_TYPES
      return (
        readLocalNotificationPrefs().desktop &&
        types.includes(notification.type)
      )
    }

    const present = async (notification: NotificationItem) => {
      // Key per version: a grouped row that grew is a new thing to announce.
      const key = `${notification.id}:${notification.updatedAt}`
      const visible = document.visibilityState === 'visible'

      // That chat is on screen: the message is already in view, so the
      // notice is read right away instead of interrupting (WhatsApp Web).
      const conversationId = notification.data.conversationId
      if (
        visible &&
        conversationId &&
        conversationId === getOpenConversation()
      ) {
        coordinator.claim(key)
        void readConversationNotices(
          queryClient,
          notification.companyId,
          conversationId
        )
        return
      }

      if (visible) {
        coordinator.claim(key)
        showNotificationToast(notification, open)
        playSound()
        return
      }

      if (!(await coordinator.shouldPresentHidden(key))) return
      if (wantsDesktop(notification)) {
        showDesktopNotification(notification, () => open(notification))
      }
      playSound()
    }

    const handleDelivered = (payload: unknown) => {
      const parsed = NotificationEventSchema.safeParse(payload)
      if (!parsed.success) return
      const { notification, unreadCount } = parsed.data

      applyToCache(
        queryClient,
        notification.companyId,
        [notification],
        unreadCount
      )
      // Another company: its badge is updated, but nothing interrupts here.
      if (notification.companyId !== companyRef.current) return

      void present(notification)
    }

    const handleRead = (payload: unknown) => {
      const parsed = NotificationReadEventSchema.safeParse(payload)
      if (!parsed.success) return
      const { companyId: readCompany, ids, unreadCount } = parsed.data
      applyReadToCache(queryClient, readCompany, ids, unreadCount)
    }

    // Replay: rows created (and groups grown) since the newest one we have.
    const replay = async () => {
      const active = companyRef.current
      if (!active) return
      const cached = queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list(active)
      )
      const newest = cached?.items[0]?.id
      if (!newest) {
        void queryClient.invalidateQueries({
          queryKey: notificationKeys.unread(active),
        })
        return
      }
      try {
        const missed = await listNotifications({
          after: newest,
          limit: BELL_PAGE_SIZE,
        })
        applyToCache(queryClient, active, missed.items, missed.unreadCount)
      } catch {
        void queryClient.invalidateQueries({
          queryKey: ['notifications', active],
        })
      }
    }

    socket.on(ConversationSocketEvent.NewNotification, handleDelivered)
    socket.on(ConversationSocketEvent.NotificationUpdated, handleDelivered)
    socket.on(ConversationSocketEvent.NotificationRead, handleRead)
    socket.on('connect', replay)

    return () => {
      socket.off(ConversationSocketEvent.NewNotification, handleDelivered)
      socket.off(ConversationSocketEvent.NotificationUpdated, handleDelivered)
      socket.off(ConversationSocketEvent.NotificationRead, handleRead)
      socket.off('connect', replay)
      coordinator.dispose()
    }
  }, [socket, queryClient, navigate])

  useUnreadTitle()
}

const COUNT_PREFIX = /^\(\d+\+?\)\s*/

/** `(3) Chat CRM`: the server's unread count of the active company. */
function useUnreadTitle(): void {
  const { unreadCount } = useNotifications()

  useEffect(() => {
    const base = document.title.replace(COUNT_PREFIX, '')
    document.title =
      unreadCount > 0
        ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}`
        : base
  }, [unreadCount])

  useEffect(
    () => () => {
      document.title = document.title.replace(COUNT_PREFIX, '')
    },
    []
  )
}
