import { createFileRoute } from '@tanstack/react-router'
import { SettingsIntegrationWhatsapp } from '@/features/settings/integrations/whatsapp'
import { requireCompanyRole } from '@/lib/guards/company-access'

export const Route = createFileRoute('/_authenticated/settings/integrations/whatsapp')({
  // Agents never see the Empresa group: send them to /403 if they type the URL.
  // Supervisors open it in read-only mode (the forms disable editing).
  beforeLoad: () => requireCompanyRole(['admin', 'supervisor']),
  component: SettingsIntegrationWhatsapp,
})
