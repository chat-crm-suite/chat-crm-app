import { useId, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  NOTIFICATION_AUDIENCE,
  NOTIFICATION_TYPES,
  type NotificationPreferences,
  type NotificationType,
} from '@chat-crm/contracts'
import { notify } from '@/lib/notify'
import {
  desktopPermission,
  readLocalNotificationPrefs,
  writeLocalNotificationPrefs,
  type LocalNotificationPrefs,
} from '@/lib/local-notification-prefs'
import { FormSection } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useMemberRole } from '@/hooks/use-member-role'
import {
  notificationPrefsKey,
  useNotificationPreferences,
} from '@/features/notifications/use-notification-preferences'
import { useActiveCompanyId } from '@/features/notifications/use-notifications'
import { saveNotificationPreferences } from '@/services/notification-preferences.service'
import { SwitchList, SwitchRow } from '../components/switch-row'
import { NOTIFICATION_COPY, NOTIFICATION_TYPE_COPY } from '../copy'

/**
 * Per-type choices are stored on the server for the active company (muted
 * types are never created for the member; `desktop` types may also raise an
 * OS notification) and apply instantly: the switch flips first and goes back
 * if the save fails. Only the types the member's role can receive are listed.
 * Sound and the OS permission are per browser.
 */
export function NotificationsForm() {
  const queryClient = useQueryClient()
  const companyId = useActiveCompanyId()
  const prefsKey = notificationPrefsKey(companyId)
  const prefs = useNotificationPreferences()
  const { role } = useMemberRole()
  const types = NOTIFICATION_TYPES.filter((type) =>
    role ? NOTIFICATION_AUDIENCE[type].includes(role) : true
  )

  const save = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      saveNotificationPreferences(next),
    onMutate: async (next: NotificationPreferences) => {
      await queryClient.cancelQueries({ queryKey: prefsKey })
      const previous = queryClient.getQueryData<NotificationPreferences>(prefsKey)
      queryClient.setQueryData(prefsKey, next)
      return { previous }
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(prefsKey, context?.previous)
      notify.error(NOTIFICATION_COPY.saveFailed, { id: 'notification-prefs:save' })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(prefsKey, saved)
    },
  })

  // Keep the contract order so the payload does not depend on click order.
  const toggled = (list: NotificationType[], type: NotificationType, on: boolean) => {
    const set = new Set(list)
    if (on) set.add(type)
    else set.delete(type)
    return NOTIFICATION_TYPES.filter((t) => set.has(t))
  }

  const current = prefs.data ?? { muted: [], desktop: [] }
  const setInApp = (type: NotificationType, enabled: boolean) =>
    save.mutate({ ...current, muted: toggled(current.muted, type, !enabled) })
  const setDesktop = (type: NotificationType, enabled: boolean) =>
    save.mutate({ ...current, desktop: toggled(current.desktop, type, enabled) })

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
            {types.map((type) => {
              const inApp = !prefs.data.muted.includes(type)
              return (
                <NotificationTypeRow
                  key={type}
                  label={NOTIFICATION_TYPE_COPY[type].label}
                  description={NOTIFICATION_TYPE_COPY[type].description}
                  inApp={inApp}
                  desktop={inApp && prefs.data.desktop.includes(type)}
                  onInAppChange={(enabled) => setInApp(type, enabled)}
                  onDesktopChange={(enabled) => setDesktop(type, enabled)}
                />
              )
            })}
          </SwitchList>
        )}
      </FormSection>

      <DeviceNotifications />
    </div>
  )
}

/** One type: in-app switch (named after the type) + OS-notification switch. */
function NotificationTypeRow({
  label,
  description,
  inApp,
  desktop,
  onInAppChange,
  onDesktopChange,
}: {
  label: string
  description: string
  inApp: boolean
  desktop: boolean
  onInAppChange: (enabled: boolean) => void
  onDesktopChange: (enabled: boolean) => void
}) {
  const id = useId()

  return (
    <li className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
      <div className='min-w-0 space-y-0.5'>
        <p id={`${id}-label`} className='text-sm font-medium'>
          {label}
        </p>
        <p id={`${id}-hint`} className='text-muted-foreground text-[13px] text-pretty'>
          {description}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-5'>
        <label className='text-muted-foreground flex items-center gap-2 text-xs' title={NOTIFICATION_COPY.inAppHint}>
          <Switch
            checked={inApp}
            onCheckedChange={onInAppChange}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-hint`}
          />
          {NOTIFICATION_COPY.inApp}
        </label>
        <label className='text-muted-foreground flex items-center gap-2 text-xs' title={NOTIFICATION_COPY.desktopTypeHint}>
          <Switch
            checked={desktop}
            disabled={!inApp}
            onCheckedChange={onDesktopChange}
            aria-label={`${label}: ${NOTIFICATION_COPY.desktopType}`}
          />
          {NOTIFICATION_COPY.desktopType}
        </label>
      </div>
    </li>
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

    notify.error(NOTIFICATION_COPY.desktopBlocked, { id: 'notification-prefs:desktop' })
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
