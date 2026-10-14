import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/contacts` became Clientes. */
export const Route = createFileRoute('/_authenticated/contacts/')({
  beforeLoad: () => {
    throw redirect({ to: '/customers', replace: true })
  },
})
