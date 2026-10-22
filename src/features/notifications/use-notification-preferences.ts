import { useQuery } from '@tanstack/react-query'
import { getNotificationPreferences } from '@/services/notification-preferences.service'
import { useActiveCompanyId } from './use-notifications'

/** Per company: the member's preferences differ in each company. */
export const notificationPrefsKey = (companyId: string) =>
  ['notification-prefs', companyId] as const

export function useNotificationPreferences() {
  const companyId = useActiveCompanyId()

  return useQuery({
    queryKey: notificationPrefsKey(companyId),
    queryFn: getNotificationPreferences,
    enabled: Boolean(companyId),
    staleTime: 5 * 60_000,
  })
}
