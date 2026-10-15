import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/users` became Equipo. */
export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: () => {
    throw redirect({ to: '/team', replace: true })
  },
})
