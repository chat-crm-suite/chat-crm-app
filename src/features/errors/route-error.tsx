import { useCallback } from 'react'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { isNetworkError } from '@/lib/http'
import { GeneralError } from './general-error'
import { ServerUnavailable } from './server-unavailable'

/**
 * Root `errorComponent`: an API that did not answer is not a crash. The root
 * `beforeLoad` needs `GET /setup/status`, so opening the app while the API is
 * still booting used to stick on the 500 page; now it waits and re-runs the
 * route as soon as the API answers. Real errors keep the 500 page.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  // Re-runs every beforeLoad/loader and clears the error once they pass.
  const retry = useCallback(() => void router.invalidate(), [router])

  if (isNetworkError(error)) return <ServerUnavailable onReconnect={retry} />
  return <GeneralError />
}
