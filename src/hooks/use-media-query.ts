import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query. Returns `false` when `matchMedia` is not
 * available (SSR / jsdom), so the desktop layout is the safe default.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(query).matches
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(query)
    const onChange = () => setMatches(mediaQuery.matches)

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [query])

  return matches
}
