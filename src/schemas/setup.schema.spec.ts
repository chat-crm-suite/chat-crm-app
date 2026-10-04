import { describe, expect, it } from 'vitest'
import { setupFormDefaults, setupFormSchema } from './setup.schema'

const valid = () => ({
  ...setupFormDefaults,
  admin: {
    ...setupFormDefaults.admin,
    username: 'admin',
    password: 'secreta-123',
    confirmPassword: 'secreta-123',
  },
  company: { ...setupFormDefaults.company, name: 'J&P Perifericos' },
})

describe('setupFormSchema', () => {
  it('accepts a valid minimal workspace without whatsapp', () => {
    const result = setupFormSchema.safeParse(valid())

    expect(result.success).toBe(true)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = setupFormSchema.safeParse({
      ...valid(),
      admin: { ...valid().admin, password: 'corta', confirmPassword: 'corta' },
    })

    expect(result.success).toBe(false)
  })

  it('rejects when the password confirmation does not match', () => {
    const result = setupFormSchema.safeParse({
      ...valid(),
      admin: { ...valid().admin, confirmPassword: 'otra-clave' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('confirmPassword')
        )
      ).toBe(true)
    }
  })

  it('requires the whatsapp credentials when the step is enabled', () => {
    const result = setupFormSchema.safeParse({ ...valid(), connectWhatsapp: true })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('accessToken')
        )
      ).toBe(true)
    }
  })

  it('accepts the whatsapp step when it is skipped', () => {
    const result = setupFormSchema.safeParse({ ...valid(), connectWhatsapp: false })

    expect(result.success).toBe(true)
  })
})
