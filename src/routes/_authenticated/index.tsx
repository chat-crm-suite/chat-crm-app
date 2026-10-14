import { createFileRoute } from '@tanstack/react-router'
import { Analytics } from '@/features/analytics'

export const Route = createFileRoute('/_authenticated/')({
  component: Analytics,
})
