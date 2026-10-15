import { ContentSection } from '../components/content-section'
import { APPEARANCE_COPY } from '../copy'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title={APPEARANCE_COPY.title}
      desc={APPEARANCE_COPY.description}
    >
      <AppearanceForm />
    </ContentSection>
  )
}
