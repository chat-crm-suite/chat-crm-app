import type {
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverResult,
} from 'react-hook-form'
import type { ZodError, ZodType } from 'zod'

/**
 * Spanish text for the validation problems a person can fix. The contracts
 * carry English default messages; this keeps the contract as the only rule
 * set while the screen speaks Spanish and says what to correct.
 */
export function issueMessage(issue: ZodError['issues'][number]): string {
  switch (issue.code) {
    case 'too_small':
      return issue.origin === 'string' && Number(issue.minimum) <= 1
        ? 'Completa este campo.'
        : issue.origin === 'string'
          ? `Escribe al menos ${issue.minimum} caracteres.`
          : `El valor mínimo es ${issue.minimum}.`
    case 'too_big':
      return issue.origin === 'string'
        ? `Usa como máximo ${issue.maximum} caracteres.`
        : `El valor máximo es ${issue.maximum}.`
    case 'invalid_format':
      return issue.format === 'email'
        ? 'Escribe un correo válido, por ejemplo nombre@empresa.com.'
        : 'El formato no es válido.'
    case 'invalid_type':
      return 'Completa este campo.'
    default:
      return issue.message || 'Revisa este campo.'
  }
}

type ResolverOptions<TForm extends FieldValues> = {
  /** Maps what the form holds (strings, '' for empty) to the API payload. */
  toPayload: (values: TForm) => unknown
  /**
   * UI-only rules composed on top of the contract (password confirmation…).
   * Keys are field paths; they are merged after the contract's own errors.
   */
  extraErrors?: (values: TForm) => Partial<Record<string, string>>
}

function setNested(
  target: Record<string, unknown>,
  path: string,
  error: { type: string; message: string }
): void {
  const keys = path.split('.')
  let cursor = target
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      if (!(key in cursor)) cursor[key] = error
      return
    }
    cursor[key] = (cursor[key] as Record<string, unknown> | undefined) ?? {}
    cursor = cursor[key] as Record<string, unknown>
  })
}

/**
 * react-hook-form resolver backed by a shared contract schema. The form keeps
 * its own value shape (empty strings while typing); `toPayload` converts it to
 * what the API accepts and the *contract* validates that payload, so the
 * rules never get re-declared by hand.
 */
export function contractResolver<TForm extends FieldValues>(
  schema: ZodType,
  { toPayload, extraErrors }: ResolverOptions<TForm>
): Resolver<TForm> {
  return async (values) => {
    const errors: Record<string, unknown> = {}
    const parsed = schema.safeParse(toPayload(values))

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setNested(errors, issue.path.join('.'), {
          type: issue.code,
          message: issueMessage(issue),
        })
      }
    }

    for (const [path, message] of Object.entries(extraErrors?.(values) ?? {})) {
      if (message) setNested(errors, path, { type: 'custom', message })
    }

    if (Object.keys(errors).length > 0) {
      return {
        values: {},
        errors: errors as FieldErrors<TForm>,
      } as ResolverResult<TForm>
    }

    return { values, errors: {} } as ResolverResult<TForm>
  }
}
