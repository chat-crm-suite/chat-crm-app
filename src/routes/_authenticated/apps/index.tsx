import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { Apps } from '@/features/apps'

const appsSearchSchema = z.object({
  filter: z.string().optional().catch(''),
  type: z.enum(['all', 'connected', 'notConnected']).optional().catch('all'),
  sort: z.enum(['asc', 'desc']).optional().catch('asc'),
})

export const Route = createFileRoute('/_authenticated/apps/')({
  validateSearch: appsSearchSchema,
  component: Apps,
})
