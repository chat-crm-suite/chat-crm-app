import { createFileRoute } from '@tanstack/react-router'
import { Tasks } from '@/features/tasks'
import { WorkSearchSchema } from '@/features/tasks/search'

export const Route = createFileRoute('/_authenticated/tasks/')({
  validateSearch: WorkSearchSchema,
  component: Tasks,
})
