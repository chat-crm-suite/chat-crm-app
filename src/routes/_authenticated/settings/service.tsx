import { createFileRoute } from '@tanstack/react-router'
import { SettingsService } from '@/features/settings/service'

export const Route = createFileRoute('/_authenticated/settings/service')({
  component: SettingsService,
})
