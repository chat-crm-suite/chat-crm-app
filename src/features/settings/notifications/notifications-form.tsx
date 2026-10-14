import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  NOTIFICATION_TYPES,
  type NotificationPreferences,
  type NotificationType,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  desktopPermission,
  readLocalNotificationPrefs,
  writeLocalNotificationPrefs,
  type LocalNotificationPrefs,
} from '@/lib/local-notification-prefs'
import { FormSection } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/services/notification-preferences.service'
import { SwitchList, SwitchRow } from '../components/switch-row'
import { NOTIFICATION_COPY, NOTIFICATION_TYPE_COPY } from '../copy'

export const NOTIFICATION_PREFS_KEY = ['notifications', 'preferences'] as const

/**
 * Per-type switches are stored on the server (muted types are never created
 * for the member) and apply instantly: the switch flips first and goes back if
 * the save fails. Sound and desktop alerts are per browser.
 */
export function NotificationsForm() {
  const queryClient = useQueryClient()
  const prefs = useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: getNotificationPreferences,
  })

  const save = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      saveNotificationPreferences(next),
    onMutate: async (next: NotificationPreferences) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY })
      const previous = queryClient.getQueryData<NotificationPreferences>(
        NOTIFICATION_PREFS_KEY
      )
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, next)
      return { previous }
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, context?.previous)
      toast.error(NOTIFICATION_COPY.saveFailed)
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, saved)
    },
  })

  const setEnabled = (type: NotificationType, enabled: boolean) => {
    const muted = new Set(prefs.data?.muted ?? [])
    if (enabled) muted.delete(type)
    else muted.add(type)
    // Keep the contract order so the payload does not depend on click order.
    save.mutate({ muted: NOTIFICATION_TYPES.filter((t) => muted.has(t)) })
  }

  return (
    <div className='space-y-10'>
      <FormSection
        title={NOTIFICATION_COPY.serverSection}
        description={NOTIFICATION_COPY.serverSectionHint}
      >
        {prefs.isPending ? (
          <Skeleton className='h-52 w-full rounded-xl' />
        ) : prefs.isError ? (
          <p className='text-muted-foreground text-sm'>
            {NOTIFICATION_COPY.loadFailed}{' '}
            <Button
              variant='link'
              className='h-auto p-0'
              onClick={() => void prefs.refetch()}
            >
              {NOTIFICATION_COPY.retry}
            </Button>
          </p>
        ) : (
          <SwitchList>
            {NOTIFICATION_TYPES.map((type) => (
              <SwitchRow
                key={type}
                label={NOTIFICATION_TYPE_COPY[type].label}
                description={NOTIFICATION_TYPE_COPY[type].description}
                checked={!prefs.data.muted.includes(type)}
                onCheckedChange={(enabled) => setEnabled(type, enabled)}
              />
            ))}
          </SwitchList>
        )}
      </FormSection>

      <DeviceNotifications />
    </div>
  )
}

function DeviceNotifications() {
  const [local, setLocal] = useState<LocalNotificationPrefs>(
    readLocalNotificationPrefs
  )
  const [permission, setPermission] = useState(desktopPermission)

  const update = (patch: Partial<LocalNotificationPrefs>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    writeLocalNotificationPrefs(next)
  }

  const toggleDesktop = async (enabled: boolean) => {
    if (!enabled) return update({ desktop: false })

    let current = desktopPermission()
    if (current === 'default') {
      current = await Notification.requestPermission()
      setPermission(current)
    }
    if (current === 'granted') return update({ desktop: true })

    toast.error(NOTIFICATION_COPY.desktopBlocked)
  }

  const unsupported = permission === 'unsupported'
  const desktopOn = local.desktop && permission === 'granted'

  return (
    <FormSection
      title={NOTIFICATION_COPY.deviceSection}
      description={NOTIFICATION_COPY.deviceSectionHint}
    >
      <SwitchList>
        <SwitchRow
          label={NOTIFICATION_COPY.sound}
          description={NOTIFICATION_COPY.soundHint}
          checked={local.sound}
          onCheckedChange={(sound) => update({ sound })}
        />
        <SwitchRow
          label={NOTIFICATION_COPY.desktop}
          description={
            unsupported
              ? NOTIFICATION_COPY.desktopUnsupported
              : permission === 'denied'
                ? NOTIFICATION_COPY.desktopBlocked
                : NOTIFICATION_COPY.desktopHint
          }
          checked={desktopOn}
          disabled={unsupported || permission === 'denied'}
          onCheckedChange={(enabled) => void toggleDesktop(enabled)}
        />
      </SwitchList>
    </FormSection>
  )
}
