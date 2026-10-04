import { describe, expect, it } from 'vitest'
import { CreateSetupSchema } from '@chat-crm/contracts'
import type { SetupStatus } from '@/services/setup.service'
import { setupFormDefaults } from '@/schemas/setup.schema'
import {
  buildSetupPayload,
  missingSetupSteps,
  resolveSetupRedirect,
} from './setup-steps'

const status = (overrides: Partial<SetupStatus> = {}): SetupStatus => ({
  initialized: false,
  hasAdmin: false,
  hasCompany: false,
  hasWhatsapp: false,
  hasUsers: false,
  requiresSetupToken: false,
  ...overrides,
})

describe('missingSetupSteps', () => {
  it('lists every step for a fresh database', () => {
    expect(missingSetupSteps(status())).toEqual([
      'admin',
      'company',
      'whatsapp',
    ])
  })

  it('prepends the token step when the server requires it', () => {
    expect(
      missingSetupSteps(status({ requiresSetupToken: true }))
    ).toEqual(['token', 'admin', 'company', 'whatsapp'])
  })

  it('skips the company step when a company already exists', () => {
    expect(missingSetupSteps(status({ hasCompany: true }))).toEqual([
      'admin',
      'whatsapp',
    ])
  })

  it('lists nothing when the app is fully initialized', () => {
    expect(
      missingSetupSteps(
        status({
          initialized: true,
          hasAdmin: true,
          hasCompany: true,
          hasWhatsapp: true,
        })
      )
    ).toEqual([])
  })
})

describe('resolveSetupRedirect', () => {
  it('sends a not-initialized app to /setup', () => {
    expect(resolveSetupRedirect(status(), '/')).toBe('/setup')
  })

  it('leaves /setup alone while not initialized', () => {
    expect(resolveSetupRedirect(status(), '/setup')).toBeNull()
  })

  it('moves an initialized app away from /setup', () => {
    expect(
      resolveSetupRedirect(status({ initialized: true }), '/setup')
    ).toBe('/sign-in')
  })

  it('leaves an initialized app on its normal routes', () => {
    expect(resolveSetupRedirect(status({ initialized: true }), '/')).toBeNull()
  })
})

describe('buildSetupPayload', () => {
  const webhookUrl = 'http://localhost:3000/integration/webhook/whatsapp'

  it('omits whatsapp when the step is skipped and strips empty fields', () => {
    const payload = buildSetupPayload(
      {
        ...setupFormDefaults,
        admin: {
          ...setupFormDefaults.admin,
          username: 'admin',
          password: 'secreta-123',
          confirmPassword: 'secreta-123',
          email: '',
        },
        company: { ...setupFormDefaults.company, name: ' J&P ' },
      },
      webhookUrl
    )

    expect(payload.whatsapp).toBeUndefined()
    expect(payload.company.name).toBe('J&P')
    expect(payload.admin.email).toBeUndefined()
    expect(payload.admin).not.toHaveProperty('confirmPassword')
    expect(payload.setupToken).toBeUndefined()
  })

  it('includes the setup token when provided', () => {
    const payload = buildSetupPayload(
      {
        ...setupFormDefaults,
        setupToken: ' token-secreto ',
        admin: {
          ...setupFormDefaults.admin,
          username: 'admin',
          password: 'secreta-123',
          confirmPassword: 'secreta-123',
        },
        company: { ...setupFormDefaults.company, name: 'J&P' },
      },
      webhookUrl
    )

    expect(payload.setupToken).toBe('token-secreto')
  })

  it('includes cleaned whatsapp credentials when enabled', () => {
    const payload = buildSetupPayload(
      {
        ...setupFormDefaults,
        admin: {
          ...setupFormDefaults.admin,
          username: 'admin',
          password: 'secreta-123',
          confirmPassword: 'secreta-123',
        },
        company: { ...setupFormDefaults.company, name: 'J&P' },
        connectWhatsapp: true,
        whatsapp: {
          businessId: ' biz-1 ',
          accessToken: 'token',
          phoneNumberId: 'phone-1',
          apiVersion: '',
        },
      },
      webhookUrl
    )

    expect(payload.whatsapp).toEqual({
      businessId: 'biz-1',
      accessToken: 'token',
      phoneNumberId: 'phone-1',
      webhookUrl,
      apiVersion: undefined,
    })
  })

  it('produces a payload accepted by the shared contract', () => {
    const payload = buildSetupPayload(
      {
        ...setupFormDefaults,
        setupToken: 'token-secreto',
        admin: {
          ...setupFormDefaults.admin,
          username: 'admin',
          password: 'secreta-123',
          confirmPassword: 'secreta-123',
          email: 'admin@example.com',
        },
        company: { ...setupFormDefaults.company, name: 'J&P' },
        connectWhatsapp: true,
        whatsapp: {
          businessId: 'biz-1',
          accessToken: 'token',
          phoneNumberId: 'phone-1',
          apiVersion: 'v22.0',
        },
      },
      webhookUrl
    )

    expect(() => CreateSetupSchema.parse(payload)).not.toThrow()
  })
})
