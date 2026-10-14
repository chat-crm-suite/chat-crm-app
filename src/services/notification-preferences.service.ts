import {
  NotificationPreferencesSchema,
  type NotificationPreferences,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const notifications = client('/notifications')

const parse = (data: unknown): NotificationPreferences =>
  import.meta.env.DEV
    ? NotificationPreferencesSchema.parse(data)
    : (data as NotificationPreferences)

/** Notification types the member muted in the active company. */
export const getNotificationPreferences =
  async (): Promise<NotificationPreferences> => {
    const { data } = await notifications.get('/preferences')
    return parse(data)
  }

/** Replaces the whole muted list. */
export const saveNotificationPreferences = async (
  input: NotificationPreferences
): Promise<NotificationPreferences> => {
  const { data } = await notifications.put('/preferences', input)
  return parse(data)
}
