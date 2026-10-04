import { createFileRoute } from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { guard } from "@/lib/guard";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await guard(context.queryClient, location.href)
  },
  component: AuthenticatedLayout,
});
