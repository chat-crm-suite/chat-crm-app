import { ContentSection } from '@/features/settings/components/content-section'
import { ServiceSettingsForm } from './service-settings-form'

export function SettingsService() {
  return (
    <ContentSection
      title='Horario y tiempo de respuesta'
      desc='Las métricas de los agentes cuentan solo el tiempo dentro de este horario.'
    >
      <ServiceSettingsForm />
    </ContentSection>
  )
}
