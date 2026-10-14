import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Chats } from '@/features/chats'

/** `?conversation=<id>` opens that conversation (analytics deep links). */
const chatsSearchSchema = z.object({
  conversation: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: chatsSearchSchema,
  component: Chats,
})
