import { ContentSection } from '../components/content-section'
import { COMPANY_COPY } from '../copy'
import { CompanyForm } from './company-form'

export function SettingsCompany() {
  return (
    <ContentSection title={COMPANY_COPY.title} desc={COMPANY_COPY.description}>
      <CompanyForm />
    </ContentSection>
  )
}
