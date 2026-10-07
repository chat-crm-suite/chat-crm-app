import { useEffect, useState } from 'react'

/**
 * Wall clock re-sampled on an interval, so relative copy (countdowns, service
 * windows) does not freeze while a view stays mounted. The default 60 s
 * matches minute-granularity copy such as `14 h 32 min`.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
