import { createFileRoute } from '@tanstack/react-router'
import { PlatformLayout } from '@/features/platform/components/platform-layout'
import { guard } from '@/lib/guard'
import { requirePlatformAdmin } from '@/lib/guards/company-access'

// Separate tree: no company sidebar, no company needed. Only platform admins
// get past it; the console password is asked for on the page itself.
export const Route = createFileRoute('/platform')({
  beforeLoad: async ({ context, location }) => {
    await guard(context.queryClient, location.href)
    requirePlatformAdmin()
  },
  component: PlatformLayout,
})
