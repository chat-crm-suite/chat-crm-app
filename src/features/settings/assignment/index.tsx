import { ContentSection } from '../components/content-section'
import { ASSIGNMENT_COPY } from '../copy'
import { AssignmentForm } from './assignment-form'

export function SettingsAssignment() {
  return (
    <ContentSection
      title={ASSIGNMENT_COPY.title}
      desc={ASSIGNMENT_COPY.description}
    >
      <AssignmentForm />
    </ContentSection>
  )
}
