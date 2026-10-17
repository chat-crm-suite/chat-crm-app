// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  autoCommitBlocker,
  buildSyncCommitMessage,
  changedContractFiles,
  lockFingerprint,
  shouldSkipSync,
  writeIfChanged,
} from './contracts-sync-core.mjs'

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

describe('changedContractFiles', () => {
  it('lists added, removed and changed contracts, sorted', () => {
    const prev = { files: { setup: 'a', channel: 'b', user: 'u', old: 'o' } }
    const next = { files: { setup: 'A', channel: 'b', user: 'u', fresh: 'f' } }
    expect(changedContractFiles(prev, next)).toEqual(['fresh', 'old', 'setup'])
  })

  it('treats a missing previous lock as everything new', () => {
    expect(changedContractFiles(null, { files: { b: '1', a: '2' } })).toEqual(['a', 'b'])
  })
})

describe('buildSyncCommitMessage', () => {
  it('names the tag, a short hash and the changed contracts', () => {
    const prev = { apiTag: 'v1.0.2', hash: 'ff582f67aa', files: { channel: 'x', setup: 'y', auth: 'z' } }
    const next = { apiTag: 'v2.2.0', hash: '36688481bb', files: { channel: 'X', setup: 'Y', auth: 'z' } }
    expect(buildSyncCommitMessage(prev, next)).toBe(
      'chore(contracts): 🔧 sync contracts lock to v2.2.0 (36688481)\n\nChanged contracts: channel, setup.',
    )
  })

  it('omits the body when only generated files were re-materialized', () => {
    const lock = { apiTag: 'v1', hash: 'abcdef1234', files: { user: 'u' } }
    expect(buildSyncCommitMessage(lock, lock)).toBe('chore(contracts): 🔧 sync contracts lock to v1 (abcdef12)')
  })
})

describe('autoCommitBlocker', () => {
  const ok = { disabled: false, insideWorkTree: true, branch: 'develop', dirtyPaths: ['contracts.lock.json'] }

  it('allows develop and feature branches with changes', () => {
    expect(autoCommitBlocker(ok)).toBeNull()
    expect(autoCommitBlocker({ ...ok, branch: 'feature/x' })).toBeNull()
  })

  it.each([
    [{ disabled: true }, /--no-commit/],
    [{ insideWorkTree: false }, /work tree/],
    [{ dirtyPaths: [] }, /nothing to commit/],
    [{ branch: '' }, /detached/],
    [{ branch: 'main' }, /on main/],
  ])('blocks %o', (override, reason) => {
    expect(autoCommitBlocker({ ...ok, ...override })).toMatch(reason)
  })
})
