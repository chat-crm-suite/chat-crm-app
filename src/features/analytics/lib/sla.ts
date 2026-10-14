import type { SlaState } from '@chat-crm/contracts'

/** Share of the SLA from which a wait is flagged as about to breach. */
export const SLA_RISK_SHARE = 0.8

/** Same thresholds as the API, recomputed while the wait ticks locally. */
export function slaStateFor(
  waitingSeconds: number,
  slaSeconds: number
): SlaState {
  if (waitingSeconds >= slaSeconds) return 'breach'
  if (waitingSeconds >= slaSeconds * SLA_RISK_SHARE) return 'risk'
  return 'ok'
}

export const SLA_COLOR: Record<SlaState, string> = {
  ok: 'var(--sla-ok)',
  risk: 'var(--sla-risk)',
  breach: 'var(--sla-breach)',
}

export const SLA_LABEL: Record<SlaState, string | null> = {
  ok: null,
  risk: 'por vencer',
  breach: 'superado',
}

/** Seconds elapsed since the snapshot was generated (never negative). */
export function secondsSince(generatedAt: Date, now: number): number {
  return Math.max(0, (now - generatedAt.getTime()) / 1000)
}
