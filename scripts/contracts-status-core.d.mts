export interface ContractFileMeta {
  hash: string
  version?: string | null
  updatedAt?: string | null
}

export interface ContractsLock {
  apiTag: string
  hash: string
  syncedAt: string
  files: Record<string, string>
}

export interface ContractsManifest {
  tag: string
  commit?: string
  hash: string
  generatedAt?: string
  files: Record<string, ContractFileMeta>
}

export interface ContractChange {
  name: string
  kind: 'changed' | 'added' | 'removed'
  from: string | null
  to: string | null
  updatedAt: string | null
}

export interface ContractsStatusResult {
  state: string
  exitCode: number
  changes: ContractChange[]
  uncommitted: string[]
  detail?: string | null
  lock?: ContractsLock | null
  manifest?: ContractsManifest | null
}

export declare const CONTRACT_STATES: {
  IN_SYNC: 'IN_SYNC'
  OUT_OF_SYNC: 'OUT_OF_SYNC'
  UNCOMMITTED: 'UNCOMMITTED'
  MIXED: 'MIXED'
  NOT_INITIALIZED: 'NOT_INITIALIZED'
  UNVERIFIABLE: 'UNVERIFIABLE'
}

export declare function formatMoment(iso?: string | null): string

export declare function diffContractFiles(
  lockFiles?: Record<string, string> | null,
  manifestFiles?: Record<string, ContractFileMeta> | null,
): ContractChange[]

export declare function evaluateContractsStatus(input: {
  lock: ContractsLock | null
  manifest: ContractsManifest | null
  uncommitted?: string[]
  detail?: string | null
}): ContractsStatusResult

export declare function renderContractsStatus(
  result: ContractsStatusResult,
  options?: { verbose?: boolean; uses?: Record<string, number> },
): string
