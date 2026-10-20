import { useNotificationRealtime } from '@/features/notifications/use-notification-realtime'
import { useCompanyUpdatedSync } from '@/features/settings/hooks/use-company-updated-sync'
import { useApplySavedTextSize } from '@/features/settings/lib/text-size'
import { useCompanyShortcuts, useRevokedCompanyNotice } from './company-switch'

/**
 * Invisible behaviours of the signed-in shell: company shortcuts, the notice
 * for a revoked company, the `company:updated` refetch, the saved text size
 * and the live notifications (toasts, OS notifications, bell sync). Mounted once, so they run on every authenticated page.
 */
export function ShellEffects() {
  useCompanyShortcuts()
  useRevokedCompanyNotice()
  useCompanyUpdatedSync()
  useApplySavedTextSize()
  useNotificationRealtime()

  return null
}
