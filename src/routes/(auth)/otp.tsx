import { createFileRoute } from '@tanstack/react-router'

import { Otp } from '@/features/auth/otp'

export const Route = createFileRoute('/(auth)/otp')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Otp />
}
