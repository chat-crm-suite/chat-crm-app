import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maskAsRead } from '@/services/notification.service'
import dayjs from 'dayjs'
import { BellIcon, CircleIcon, MessageSquareDot } from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

/** Notification as returned by GET /notifications. */
interface NotificationItem {
  id: string
  title: string
  body: string
  createdAt: string
  readAt?: string | null
}

export const NotificationBell = () => {
  const { notifications, isLoading } = useNotifications()
  const typedNotifications = notifications as NotificationItem[]
  const [readMessages, setReadMessages] = useState<string[]>([])
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: (notifs: string[]) => maskAsRead(notifs),
    onError: () =>
      toast.error('No se pudo marco como leido las notificaciones'),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
  })

  const handleMarkAllRead = () => {
    const noReadNotifications = typedNotifications
      .filter((n) => !n.readAt)
      .map((n) => n.id)
    mutate(noReadNotifications)
  }

  const handleMarkSingleRead = (id: string) => {
    if (!readMessages.includes(id)) {
      setReadMessages((prev) => [...prev, id])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative rounded-full'>
          <BellIcon />
          {typedNotifications.some((n) => !n?.readAt) && (
            <span className='absolute -top-0 -right-0 size-2 animate-bounce rounded-full bg-sky-600 dark:bg-sky-400' />
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0'>
        <div className='grid'>
          <div className='flex items-center justify-between gap-2 px-4 py-2.5'>
            <span className='font-medium'>Notifications</span>
            <Button
              variant='secondary'
              className='h-7 rounded-full px-2 py-1 text-xs'
              onClick={handleMarkAllRead}
              disabled={isLoading || typedNotifications.length === 0}
            >
              {'Mark all as read'}
            </Button>
          </div>
          <Separator />
          <ul className='grid gap-4 p-2'>
            {isLoading ? (
              <span className='text-muted-foreground text-center text-sm'>
                Loading...
              </span>
            ) : typedNotifications.length === 0 ? (
              <span className='text-muted-foreground text-center text-sm'>
                No notifications
              </span>
            ) : (
              typedNotifications.map((item) => (
                <li
                  key={item.id}
                  className='hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5'
                  onClick={() => handleMarkSingleRead(item.id)}
                >
                  <MessageSquareDot size={24} />
                  <div className='flex-1 space-y-1'>
                    <div className='text-sm font-medium'>{item.title}</div>
                    <div className='flex'>
                      <div className='basis-3/5 font-sans text-sm'>
                        {item.body}
                      </div>
                      <p className='text-muted-foreground basis-2/5 text-right text-xs'>{`${dayjs(item.createdAt).format('MMMM D')} ago`}</p>
                    </div>
                  </div>
                  {!item.readAt && (
                    <CircleIcon className='fill-primary text-primary size-2 self-center' />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}
