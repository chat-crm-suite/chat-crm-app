import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { NotificationItem } from '@chat-crm/contracts'
import {
  BellIcon,
  CircleAlert,
  ClipboardList,
  MessageSquareDot,
  Radio,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { desktopPermission } from '@/lib/local-notification-prefs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { relativeTime } from '@/components/data-grid/format'
import { requestDesktopPermission } from '@/features/notifications/desktop-notifier'
import {
  notificationTarget,
  notificationTitle,
} from '@/features/notifications/notification-link'
import {
  NOTIFICATIONS_COPY as COPY,
  useMarkNotificationsRead,
  useNotifications,
} from '@/features/notifications/use-notifications'

const TYPE_ICON: Record<NotificationItem['type'], LucideIcon> = {
  conversation_assigned: MessageSquareDot,
  conversation_message: MessageSquareDot,
  queue_unassigned: MessageSquareDot,
  task_assigned: ClipboardList,
  task_due: ClipboardList,
  channel_down: Radio,
  ia_down: CircleAlert,
  spend_budget: Wallet,
}

const SEVERITY_TONE: Record<NotificationItem['severity'], string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-destructive/10 text-destructive',
}

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/**
 * Header bell of the active company: server badge, latest activity first,
 * grouped rows with their count. Opening an item marks it read (synced to
 * the other tabs by the server) and takes you to it.
 */
export const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { items, unreadCount, isLoading, isError, refetch } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const [permission, setPermission] = useState(desktopPermission)

  const openItem = (item: NotificationItem) => {
    if (!item.readAt) markRead.mutate([item.id])
    const target = notificationTarget(item)
    if (!target) return
    setOpen(false)
    void navigate(
      target.to === '/chats'
        ? { to: '/chats', search: target.search }
        : { to: target.to }
    )
  }

  const enableDesktop = async () =>
    setPermission(await requestDesktopPermission())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative rounded-full'
          aria-label={
            unreadCount
              ? `${COPY.openBell} (${unreadCount} sin leer)`
              : COPY.openBell
          }
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className='bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums'>
              {badgeLabel(unreadCount)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[22rem] p-0'>
        <div className='flex items-center justify-between gap-2 px-4 py-2.5'>
          <span className='font-medium'>{COPY.title}</span>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={() => markRead.mutate('all')}
            disabled={unreadCount === 0}
          >
            {COPY.markAll}
          </Button>
        </div>
        <Separator />

        {permission === 'default' && (
          <>
            <div className='bg-muted/50 flex items-center gap-3 px-4 py-2.5'>
              <p className='text-muted-foreground flex-1 text-xs'>
                {COPY.enableDesktopHint}
              </p>
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs'
                onClick={() => void enableDesktop()}
              >
                {COPY.enableDesktop}
              </Button>
            </div>
            <Separator />
          </>
        )}

        {isLoading ? (
          <div className='space-y-2 p-3'>
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className='h-12 w-full rounded-lg' />
            ))}
          </div>
        ) : isError ? (
          <div className='text-muted-foreground p-6 text-center text-sm'>
            {COPY.loadFailed}{' '}
            <Button
              variant='link'
              className='h-auto p-0'
              onClick={() => void refetch()}
            >
              {COPY.retry}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className='p-8 text-center'>
            <BellIcon className='text-muted-foreground mx-auto mb-2 size-6' />
            <p className='text-sm font-medium'>{COPY.empty}</p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {COPY.emptyHint}
            </p>
          </div>
        ) : (
          <ScrollArea className='max-h-[min(26rem,70vh)]'>
            <ul className='grid gap-0.5 p-1.5'>
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={openItem} />
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem
  onOpen: (item: NotificationItem) => void
}) {
  const Icon =
    item.severity === 'warning' || item.severity === 'critical'
      ? TriangleAlert
      : TYPE_ICON[item.type]
  const unread = !item.readAt

  return (
    <li>
      <button
        type='button'
        onClick={() => onOpen(item)}
        className={cn(
          'hover:bg-accent focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-start outline-none focus-visible:ring-2',
          unread && 'bg-accent/40'
        )}
      >
        <span
          className={cn(
            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
            SEVERITY_TONE[item.severity]
          )}
        >
          <Icon className='size-4' />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='flex items-baseline gap-2'>
            <span
              className={cn(
                'truncate text-sm',
                unread ? 'font-semibold' : 'font-medium'
              )}
            >
              {notificationTitle(item)}
            </span>
            <time
              dateTime={item.updatedAt}
              className='text-muted-foreground ms-auto shrink-0 text-xs'
            >
              {relativeTime(item.updatedAt)}
            </time>
          </span>
          {item.body && (
            <span className='text-muted-foreground line-clamp-2 text-xs'>
              {item.body}
            </span>
          )}
        </span>
        {unread && (
          <span
            aria-label='Sin leer'
            className='bg-primary mt-2 size-2 shrink-0 rounded-full'
          />
        )}
      </button>
    </li>
  )
}
