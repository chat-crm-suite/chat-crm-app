import type { DataSufficiency } from '@chat-crm/contracts'

/** What one observation is called, for the "N more needed" copy. */
export type SampleUnit = 'days' | 'cases' | 'agents' | 'messages'

const UNIT_COPY: Record<SampleUnit, [singular: string, plural: string]> = {
  days: ['día', 'días'],
  cases: ['caso', 'casos'],
  agents: ['agente', 'agentes'],
  messages: ['mensaje', 'mensajes'],
}

export function sufficiencyMessage(
  meta: DataSufficiency,
  unit: SampleUnit,
  what: string
): string | null {
  if (meta.status === 'ok') return null
  if (meta.status === 'empty') return `Todavía no hay datos para ${what}.`
  const missing = Math.max(1, meta.minimumSample - meta.sampleSize)
  const [one, many] = UNIT_COPY[unit]
  return `Faltan ${missing} ${missing === 1 ? one : many} de datos para ${what}.`
}
