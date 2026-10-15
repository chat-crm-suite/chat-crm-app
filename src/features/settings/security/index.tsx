import { ContentSection } from '../components/content-section'
import { SECURITY_COPY } from '../copy'
import { SecurityForm } from './security-form'

export function SettingsSecurity() {
  return (
    <ContentSection
      title={SECURITY_COPY.title}
      desc={SECURITY_COPY.description}
    >
      <SecurityForm />
    </ContentSection>
  )
}
