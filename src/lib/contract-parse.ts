import type { z } from 'zod'

/**
 * Turns an API payload into its contract type.
 *
 * Parsing is not only a check: it is what turns wire values into contract
 * types (`z.coerce.date()` makes ISO strings real `Date`s), so it runs in
 * every build. Skipping it in production left dates as strings and broke any
 * `.getTime()` (analytics widgets, v2.1.0).
 *
 * - dev: strict, a contract drift throws right away;
 * - prod: tolerant, a drifted payload is logged and returned as-is instead of
 *   taking the screen down.
 */
export function parseContract<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  if (import.meta.env.DEV) return schema.parse(data)

  const result = schema.safeParse(data)
  if (result.success) return result.data

  // eslint-disable-next-line no-console
  console.warn(
    '[contracts] API response does not match its contract',
    result.error.issues.slice(0, 3)
  )
  return data as z.infer<T>
}
