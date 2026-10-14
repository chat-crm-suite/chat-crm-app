import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Optional text inputs hand back `''` when untouched; the contracts model
 * "not provided" as a missing key. This drops empty strings before the shared
 * schema validates, so the contract stays the only source of truth and the
 * parsed values can be sent as they are.
 */
export function withoutEmptyStrings<T extends Record<string, unknown>>(
  values: T,
  /** Fields where `''` is meaningful (an edit that blanks the value). */
  keepEmpty: readonly string[] = []
): T {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => value !== '' || keepEmpty.includes(key)
    )
  ) as T
}

/** `zodResolver(schema)` that treats empty strings as missing values. */
export function contractResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType,
  options: { keepEmpty?: readonly string[] } = {}
): Resolver<TFieldValues> {
  // The cast bridges zod 4's input/output generics with react-hook-form's.
  const resolve = zodResolver(schema as never) as unknown as Resolver<TFieldValues>

  const { keepEmpty } = options

  return (values, context, resolverOptions) =>
    resolve(withoutEmptyStrings(values, keepEmpty), context, resolverOptions)
}

/** Keeps only the fields the person actually changed. */
export function pickDirty<T extends Record<string, unknown>>(
  values: T,
  dirty: Partial<Record<keyof T, unknown>>
): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => dirty[key as keyof T])
  ) as Partial<T>
}

/** "1 conversación" / "3 conversaciones". */
export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/** Drops keys whose value is `undefined` or an empty array/string (clean URLs). */
export function compactSearch<T extends Record<string, unknown>>(search: T): T {
  return Object.fromEntries(
    Object.entries(search).filter(
      ([, value]) =>
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
    )
  ) as T
}
