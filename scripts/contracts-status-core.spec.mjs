// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  CONTRACT_STATES,
  diffContractFiles,
  evaluateContractsStatus,
  formatMoment,
  renderContractsStatus,
} from './contracts-status-core.mjs'

const lock = {
  apiTag: 'v2.3.0',
  hash: 'hash-old',
  syncedAt: '2026-10-09T18:40:00.000Z',
  files: { user: 'h-user-old', auth: 'h-auth-same' },
}

const manifest = {
  tag: 'v2.4.0',
  commit: 'abc123',
  hash: 'hash-new',
  generatedAt: '2026-10-11T09:05:00.000Z',
  files: {
    user: { hash: 'h-user-new', version: 'v2.4.0', updatedAt: '2026-10-10T14:22:00.000Z' },
    auth: { hash: 'h-auth-same', version: 'v2.3.0', updatedAt: '2026-10-05T22:33:00.000Z' },
    billing: { hash: 'h-billing', version: 'v2.4.0', updatedAt: '2026-10-11T09:05:00.000Z' },
  },
}

describe('formatMoment', () => {
  it('renders DD-Mon HH:MM in UTC', () => {
    expect(formatMoment('2026-10-11T09:05:00.000Z')).toBe('11-Oct 09:05')
  })

  it('falls back to "unknown" on missing/invalid input', () => {
    expect(formatMoment(null)).toBe('unknown')
    expect(formatMoment('not-a-date')).toBe('unknown')
  })
})

describe('diffContractFiles', () => {
  it('reports changed, added and removed contracts only', () => {
    const changes = diffContractFiles(lock.files, manifest.files)

    expect(changes.map((c) => [c.name, c.kind])).toEqual([
      ['billing', 'added'],
      ['user', 'changed'],
    ])
  })

  it('detects removals', () => {
    const changes = diffContractFiles({ gone: 'h' }, {})
    expect(changes).toEqual([
      expect.objectContaining({ name: 'gone', kind: 'removed' }),
    ])
  })
})

describe('evaluateContractsStatus', () => {
  it('returns IN SYNC (exit 0) when hashes match and tree is clean', () => {
    const result = evaluateContractsStatus({ lock, manifest: { ...manifest, hash: lock.hash } })
    expect(result.state).toBe(CONTRACT_STATES.IN_SYNC)
    expect(result.exitCode).toBe(0)
    expect(result.changes).toEqual([])
  })

  it('returns OUT OF SYNC (exit 1) with the change list', () => {
    const result = evaluateContractsStatus({ lock, manifest })
    expect(result.state).toBe(CONTRACT_STATES.OUT_OF_SYNC)
    expect(result.exitCode).toBe(1)
    expect(result.changes.map((c) => c.name)).toEqual(['billing', 'user'])
  })

  it('returns UNCOMMITTED (exit 1) when only the tree is dirty', () => {
    const result = evaluateContractsStatus({
      lock,
      manifest: { ...manifest, hash: lock.hash },
      uncommitted: ['M src/generated/snapshot.json'],
    })
    expect(result.state).toBe(CONTRACT_STATES.UNCOMMITTED)
    expect(result.exitCode).toBe(1)
  })

  it('returns MIXED when both drift and dirty', () => {
    const result = evaluateContractsStatus({
      lock,
      manifest,
      uncommitted: ['M contracts.lock.json'],
    })
    expect(result.state).toBe(CONTRACT_STATES.MIXED)
    expect(result.exitCode).toBe(1)
  })

  it('returns NOT INITIALIZED (exit 2) without a lock', () => {
    const result = evaluateContractsStatus({ lock: null, manifest })
    expect(result.state).toBe(CONTRACT_STATES.NOT_INITIALIZED)
    expect(result.exitCode).toBe(2)
  })

  it('returns UNVERIFIABLE (exit 2) without a manifest', () => {
    const result = evaluateContractsStatus({ lock, manifest: null })
    expect(result.state).toBe(CONTRACT_STATES.UNVERIFIABLE)
    expect(result.exitCode).toBe(2)
  })
})

describe('renderContractsStatus', () => {
  it('prints a single line when in sync', () => {
    const result = evaluateContractsStatus({ lock, manifest: { ...manifest, hash: lock.hash, tag: 'v2.4.0' } })
    const text = renderContractsStatus(result)
    expect(text.split('\n')).toHaveLength(1)
    expect(text).toContain('[OK] Contracts IN SYNC')
  })

  it('renders the drift table in English ASCII', () => {
    const text = renderContractsStatus(evaluateContractsStatus({ lock, manifest }))
    expect(text).toContain('[FAIL] Contracts OUT OF SYNC')
    expect(text).toContain('yours:   v2.3.0')
    expect(text).toContain('backend: v2.4.0')
    expect(text).toContain('user')
    expect(text).toContain('Next:')
    // No unicode arrows / emoji.
    expect(text).not.toMatch(/[→⚠✅❌]/)
  })

  it('truncates long change lists unless verbose', () => {
    const many = { files: {} }
    for (let i = 0; i < 8; i += 1) {
      many.files[`c${i}`] = { hash: `h${i}`, updatedAt: '2026-10-11T09:05:00.000Z' }
    }
    const result = evaluateContractsStatus({ lock, manifest: { tag: 'v9', hash: 'x', files: many.files } })

    expect(renderContractsStatus(result)).toContain('... and 5 more (use --verbose)')
    expect(renderContractsStatus(result, { verbose: true })).not.toContain('... and')
  })
})
