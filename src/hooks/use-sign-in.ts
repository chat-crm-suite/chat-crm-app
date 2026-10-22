import { useMutation } from "@tanstack/react-query"
import { login } from "@/services/auth.service"
import { SCREEN_HANDLES_ERRORS } from '@/lib/handle-server-error'

export function useSignIn() {
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: login
  })
}
