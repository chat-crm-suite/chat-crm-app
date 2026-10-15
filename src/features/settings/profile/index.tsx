import { ContentSection } from '../components/content-section'
import { PROFILE_COPY } from '../copy'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection title={PROFILE_COPY.title} desc={PROFILE_COPY.description}>
      <ProfileForm />
    </ContentSection>
  )
}
