import type { z } from 'zod'

/**
 * Dev-only runtime check of an API payload against its shared contract, so a
 * contract drift fails loudly while developing and costs nothing in prod.
 */
export function devParse<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  if (import.meta.env.DEV) {
    return schema.parse(data)
  }
  return data as z.infer<T>
}
