// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { lockFingerprint, shouldSkipSync, writeIfChanged } from './contracts-sync-core.mjs'

const created = []

afterEach(() => {
  while (created.length) fs.rmSync(created.pop(), { recursive: true, force: true })
})

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-core-'))
  created.push(dir)
  return dir
}

describe('lockFingerprint', () => {
  it('ignores the volatile syncedAt', () => {
    const a = { apiTag: 'v1', hash: 'h', syncedAt: '2026-01-01T00:00:00Z', files: { user: 'u' } }
    const b = { apiTag: 'v1', hash: 'h', syncedAt: '2026-10-14T01:40:00Z', files: { user: 'u' } }
    expect(lockFingerprint(a)).toBe(lockFingerprint(b))
  })

  it('is order-independent for the files map', () => {
    const a = { apiTag: 'v1', hash: 'h', files: { user: 'u', auth: 'a' } }
    const b = { apiTag: 'v1', hash: 'h', files: { auth: 'a', user: 'u' } }
    expect(lockFingerprint(a)).toBe(lockFingerprint(b))
  })
})

describe('shouldSkipSync', () => {
  const next = { apiTag: 'v1', hash: 'h', files: { user: 'u' } }

  it('skips when only syncedAt would change (the reported bug)', () => {
    const existing = { ...next, syncedAt: '2026-10-14T01:37:00Z' }
    expect(shouldSkipSync(existing, { ...next, syncedAt: '2026-10-14T01:40:00Z' })).toBe(true)
  })

  it('does not skip when the hash changed', () => {
    expect(shouldSkipSync({ ...next, hash: 'other' }, next)).toBe(false)
  })

  it('does not skip when a per-file hash changed', () => {
    expect(shouldSkipSync({ ...next, files: { user: 'different' } }, next)).toBe(false)
  })

  it('does not skip without an existing lock', () => {
    expect(shouldSkipSync(null, next)).toBe(false)
  })
})

describe('writeIfChanged', () => {
  it('writes the first time and is a no-op when content is identical', () => {
    const file = path.join(tmpDir(), 'out.json')
    expect(writeIfChanged(file, '{"a":1}\n')).toBe(true)
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1}\n')
    expect(writeIfChanged(file, '{"a":1}\n')).toBe(false)
    expect(writeIfChanged(file, '{"a":2}\n')).toBe(true)
  })
})
