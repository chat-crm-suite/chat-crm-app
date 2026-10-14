import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/guard'
import { Team } from '@/features/team'
import { TeamSearchSchema } from '@/features/team/search'

export const Route = createFileRoute('/_authenticated/team/')({
  // Equipo is for admins and supervisors; agents never see it.
  beforeLoad: requireRole('admin', 'supervisor'),
  validateSearch: TeamSearchSchema,
  component: Team,
})
