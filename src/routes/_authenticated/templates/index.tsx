import { createFileRoute } from '@tanstack/react-router'
import { Templates } from '@/features/templates'
import { TemplatesSearchSchema } from '@/features/templates/search'

export const Route = createFileRoute('/_authenticated/templates/')({
  // Every member may read templates; only admins act on them (in the page).
  validateSearch: TemplatesSearchSchema,
  component: Templates,
})
