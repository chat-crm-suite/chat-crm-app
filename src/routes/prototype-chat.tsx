/**
 * PROTOTYPE (disposable): entry of the chat v2 design comparator.
 *
 *   /prototype-chat?variant=a|b|c|d|e|f&sentiment=full|mini|off
 *
 * Outside `_authenticated` on purpose: no API or socket, just in-memory mock.
 * Deleted together with `src/features/chats/prototype/` once a design is
 * picked.
 */
import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { PrototypeChat } from '@/features/chats/prototype/prototype-chat'
import { PROTOTYPE_VARIANTS } from '@/features/chats/prototype/prototype.data'

const prototypeSearchSchema = z.object({
  variant: z.enum(PROTOTYPE_VARIANTS).catch('a'),
  sentiment: z.enum(['full', 'mini', 'off']).catch('full'),
})

export const Route = createFileRoute('/prototype-chat')({
  // Never ship the comparator: a stray merge stays a 404 in production builds.
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  validateSearch: prototypeSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { variant, sentiment } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PrototypeChat
      variant={variant}
      sentiment={sentiment}
      onVariantChange={(next) =>
        void navigate({
          search: (prev) => ({ ...prev, variant: next }),
          replace: true,
        })
      }
      onSentimentChange={(next) =>
        void navigate({ search: (prev) => ({ ...prev, sentiment: next }) })
      }
    />
  )
}
