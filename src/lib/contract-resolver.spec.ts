import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { contractResolver } from './contract-resolver'

const schema = z.object({
  name: z.string().trim().min(1).max(5),
  email: z.email().optional(),
  admin: z.object({ email: z.email() }).optional(),
})

type Values = { name: string; email: string; adminEmail: string }

const resolver = contractResolver<Values>(schema, {
  toPayload: (v) => ({
    name: v.name,
    email: v.email || undefined,
    admin: v.adminEmail ? { email: v.adminEmail } : undefined,
  }),
  extraErrors: (v) => ({
    email: v.email === 'taken@x.test' ? 'Ya existe.' : undefined,
  }),
})

const run = (values: Values) =>
  resolver(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  } as never)

describe('contractResolver', () => {
  it('passes values the contract accepts, mapping empty strings away', async () => {
    const result = await run({ name: 'Acme', email: '', adminEmail: '' })
    expect(result.errors).toEqual({})
    expect(result.values).toMatchObject({ name: 'Acme' })
  })

  it('reports contract problems per field in Spanish', async () => {
    const result = await run({ name: '', email: 'x', adminEmail: '' })
    const errors = result.errors as Record<string, { message: string }>

    expect(errors.name.message).toBe('Completa este campo.')
    expect(errors.email.message).toMatch(/Escribe un correo válido/)
  })

  it('reports limits and nested paths', async () => {
    const result = await run({ name: 'demasiado', email: '', adminEmail: 'no' })
    const errors = result.errors as unknown as {
      name: { message: string }
      admin: { email: { message: string } }
    }

    expect(errors.name.message).toBe('Usa como máximo 5 caracteres.')
    expect(errors.admin.email.message).toMatch(/Escribe un correo válido/)
  })

  it('adds UI-only rules on top of the contract', async () => {
    const result = await run({
      name: 'Acme',
      email: 'taken@x.test',
      adminEmail: '',
    })
    const errors = result.errors as Record<string, { message: string }>

    expect(errors.email.message).toBe('Ya existe.')
  })
})
