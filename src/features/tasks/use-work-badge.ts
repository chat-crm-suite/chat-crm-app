import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConversationSocketEvent, TaskSocketEvent } from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import { useSocket } from '@/context/socket-provider'
import {
  taskKeys,
  useWorkQueue,
  workBadgeCount,
  workQueueKeys,
} from './task-queries'

/** Bursts of task/conversation events collapse into one refetch. */
export const WORK_REALTIME_DEBOUNCE_MS = 500

const QUEUE_EVENTS = [
  ConversationSocketEvent.StatusChanged,
  ConversationSocketEvent.Created,
  ConversationSocketEvent.ConversationAssigned,
  ConversationSocketEvent.ConversationUnassigned,
] as const

/**
 * Keeps tasks and the work queue live app-wide (mounted once, by the
 * sidebar): `task:changed` refreshes tasks + queue, conversation lifecycle
 * and assignment events refresh the queue.
 */
export function useWorkRealtime() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!socket) return

    const refreshQueue = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(
        () =>
          void queryClient.invalidateQueries({ queryKey: workQueueKeys.all }),
        WORK_REALTIME_DEBOUNCE_MS
      )
    }
    const handleTask = () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      refreshQueue()
    }

    socket.on(TaskSocketEvent.Changed, handleTask)
    QUEUE_EVENTS.forEach((event) => socket.on(event, refreshQueue))

    return () => {
      socket.off(TaskSocketEvent.Changed, handleTask)
      QUEUE_EVENTS.forEach((event) => socket.off(event, refreshQueue))
      clearTimeout(timer.current)
    }
  }, [socket, queryClient])
}

/** Sidebar counter of Mi trabajo (0 while unknown or failing). */
export function useWorkBadge(): number {
  const hasCompany = useAuthStore((state) => !!state.auth.company?.id)
  useWorkRealtime()
  const queue = useWorkQueue('mine', undefined, hasCompany)
  return workBadgeCount(queue.data?.counts)
}
