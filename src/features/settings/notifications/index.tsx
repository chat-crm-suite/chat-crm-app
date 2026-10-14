import { ContentSection } from '../components/content-section'
import { NOTIFICATION_COPY } from '../copy'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  return (
    <ContentSection
      title={NOTIFICATION_COPY.title}
      desc={NOTIFICATION_COPY.description}
    >
      <NotificationsForm />
    </ContentSection>
  )
}
