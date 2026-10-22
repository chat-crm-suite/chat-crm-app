import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationListResponse } from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import { notify } from '@/lib/notify'
import {
  applyReadToCache,
  BELL_PAGE_SIZE,
  notificationKeys,
} from './notification-cache'
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service'

export const NOTIFICATIONS_COPY = {
  title: 'Notificaciones',
  markAll: 'Marcar todas como leídas',
  empty: 'No tienes notificaciones',
  emptyHint: 'Te avisaremos aquí cuando pase algo importante.',
  loadFailed: 'No se pudieron cargar las notificaciones.',
  retry: 'Reintentar',
  markFailed: 'No se pudo marcar como leída. Inténtalo de nuevo.',
  openBell: 'Abrir notificaciones',
  enableDesktop: 'Activar avisos del sistema',
  enableDesktopHint: 'Recibe avisos aunque esta pestaña esté en segundo plano.',
} as const

export function useActiveCompanyId(): string {
  return useAuthStore((state) => state.auth.company.id) ?? ''
}

/** Bell list + badge of the active company. */
export function useNotifications() {
  const companyId = useActiveCompanyId()

  const list = useQuery({
    queryKey: notificationKeys.list(companyId),
    queryFn: () => listNotifications({ limit: BELL_PAGE_SIZE }),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  })

  // The badge also lives on its own key: the socket sets it directly and the
  // header reads it without loading the list.
  const unread = useQuery({
    queryKey: notificationKeys.unread(companyId),
    queryFn: getUnreadCount,
    enabled: Boolean(companyId),
    staleTime: 60_000,
  })

  return {
    items: list.data?.items ?? [],
    unreadCount: unread.data ?? list.data?.unreadCount ?? 0,
    isLoading: list.isPending,
    isError: list.isError,
    refetch: list.refetch,
  }
}

/**
 * Read state, optimistic: the row and the badge change at once and roll back
 * if the server refuses. The server echoes `notification:read` to the other
 * tabs, so they follow without polling.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  const companyId = useActiveCompanyId()
  const listKey = notificationKeys.list(companyId)
  const unreadKey = notificationKeys.unread(companyId)

  return useMutation({
    meta: { toast: false },
    mutationFn: (ids: string[] | 'all') =>
      ids === 'all'
        ? markAllNotificationsRead()
        : Promise.all(ids.map((id) => markNotificationRead(id))).then(
            (counts) => counts.at(-1) ?? 0
          ),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = {
        list: queryClient.getQueryData<NotificationListResponse>(listKey),
        unread: queryClient.getQueryData<number>(unreadKey),
      }
      const items = previous.list?.items ?? []
      const unreadNow = previous.unread ?? previous.list?.unreadCount ?? 0
      const clearing =
        ids === 'all'
          ? unreadNow
          : items.filter((item) => !item.readAt && ids.includes(item.id)).length
      applyReadToCache(
        queryClient,
        companyId,
        ids,
        Math.max(0, unreadNow - clearing)
      )
      return previous
    },
    onError: (_error, _ids, previous) => {
      queryClient.setQueryData(listKey, previous?.list)
      queryClient.setQueryData(unreadKey, previous?.unread)
      notify.error(NOTIFICATIONS_COPY.markFailed, {
        id: 'notifications:mark-failed',
      })
    },
    onSuccess: (unreadCount) => {
      queryClient.setQueryData(unreadKey, unreadCount)
    },
  })
}
