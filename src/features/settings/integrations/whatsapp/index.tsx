import { ContentSection } from '@/features/settings/components/content-section'
import { WHATSAPP_COPY } from '@/features/settings/copy'
import { WhatsappForm } from '@/features/settings/integrations/whatsapp/whatsapp-form'

export function SettingsIntegrationWhatsapp() {
  return (
    <ContentSection
      title={WHATSAPP_COPY.title}
      desc={WHATSAPP_COPY.description}
    >
      <WhatsappForm />
    </ContentSection>
  )
}
