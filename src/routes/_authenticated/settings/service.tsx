import { createFileRoute } from '@tanstack/react-router'
import { SettingsService } from '@/features/settings/service'
import { requireCompanyRole } from '@/lib/guards/company-access'

export const Route = createFileRoute('/_authenticated/settings/service')({
  // Agents never see the Empresa group: send them to /403 if they type the URL.
  // Supervisors open it in read-only mode (the forms disable editing).
  beforeLoad: () => requireCompanyRole(['admin', 'supervisor']),
  component: SettingsService,
})
