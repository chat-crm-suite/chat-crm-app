// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { resolveContractsDir } from './contracts-path.mjs'

/**
 * Unit tests for the shared-contracts resolver. They build throwaway fixture
 * trees under the OS temp dir so they do not depend on the real checkout
 * layout (main checkouts, paired worktrees or Docker).
 *
 * Layouts covered:
 * - Root worktrees (option A): `<root>/.worktrees/<name>/chat-crm-{api,app}`
 * - Legacy nested worktrees:   `<root>/chat-crm-{api,app}/.worktrees/<name>`
 * - Sibling checkouts:         `<root>/chat-crm-{api,app}`
 * - `CONTRACTS_DIR` override (Docker / CI).
 */

const created = []

function makeTmpRoot() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'contracts-path-'))
  created.push(base)
  return base
}

/** Writes `index.ts` inside a contracts dir, creating parents. */
function writeContractsDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.ts'), 'export const x = 1\n', 'utf8')
  return dir
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

afterEach(() => {
  delete process.env.CONTRACTS_DIR
  while (created.length) {
    fs.rmSync(created.pop(), { recursive: true, force: true })
  }
})

describe('resolveContractsDir', () => {
  it('finds the paired worktree at the repository root (layout A)', () => {
    const base = makeTmpRoot()
    const name = 'contracts-verify'
    const apiContracts = writeContractsDir(
      path.join(base, '.worktrees', name, 'chat-crm-api', 'src', 'contracts')
    )
    const appWorktree = mkdirp(
      path.join(base, '.worktrees', name, 'chat-crm-app')
    )

    expect(resolveContractsDir(appWorktree)).toBe(apiContracts)
  })

  it('finds the legacy nested worktree layout', () => {
    const base = makeTmpRoot()
    const name = 'feature-x'
    const apiContracts = writeContractsDir(
      path.join(base, 'chat-crm-api', '.worktrees', name, 'src', 'contracts')
    )
    const appWorktree = mkdirp(
      path.join(base, 'chat-crm-app', '.worktrees', name)
    )

    expect(resolveContractsDir(appWorktree)).toBe(apiContracts)
  })

  it('finds sibling checkouts', () => {
    const base = makeTmpRoot()
    const apiContracts = writeContractsDir(
      path.join(base, 'chat-crm-api', 'src', 'contracts')
    )
    const appRepo = mkdirp(path.join(base, 'chat-crm-app'))

    expect(resolveContractsDir(appRepo)).toBe(apiContracts)
  })

  it('honours CONTRACTS_DIR above every heuristic candidate', () => {
    const base = makeTmpRoot()
    const override = writeContractsDir(path.join(base, 'mounted-contracts'))
    // A sibling also exists; the override must still win.
    writeContractsDir(path.join(base, 'chat-crm-api', 'src', 'contracts'))
    process.env.CONTRACTS_DIR = override

    expect(resolveContractsDir(mkdirp(path.join(base, 'chat-crm-app')))).toBe(
      override
    )
  })

  it('ignores CONTRACTS_DIR when it has no index.ts and falls through', () => {
    const base = makeTmpRoot()
    process.env.CONTRACTS_DIR = path.join(base, 'empty-dir')
    const apiContracts = writeContractsDir(
      path.join(base, 'chat-crm-api', 'src', 'contracts')
    )

    expect(resolveContractsDir(mkdirp(path.join(base, 'chat-crm-app')))).toBe(
      apiContracts
    )
  })

  it('throws when no candidate contains index.ts', () => {
    const base = makeTmpRoot()
    const appRepo = mkdirp(path.join(base, 'chat-crm-app'))

    expect(() => resolveContractsDir(appRepo)).toThrow(
      /Contracts directory not found/
    )
  })
})
