import {
  DEFAULT_SLA_FIRST_RESPONSE_SECONDS,
  DEFAULT_SLA_TARGET_SHARE,
  type BusinessHours,
  type ServiceSettings,
} from '@chat-crm/contracts'

export const WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

export type DayDraft = { open: boolean; start: string; end: string }

export type Draft = {
  alwaysOpen: boolean
  timezone: string
  days: DayDraft[]
  slaMinutes: string
  targetPercent: string
}

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Form state from the API settings (one interval per day in this form). */
export function toDraft(settings: ServiceSettings | undefined): Draft {
  const hours = settings?.businessHours ?? null
  return {
    alwaysOpen: hours === null,
    timezone: hours?.timezone ?? browserTimezone(),
    days: WEEKDAYS.map((_, index) => {
      const day = hours?.days.find((d) => d.weekday === index + 1)
      const first = day?.intervals[0]
      return first
        ? { open: true, start: first.start, end: first.end }
        : {
            open: hours === null ? index < 5 : false,
            start: '09:00',
            end: '18:00',
          }
    }),
    slaMinutes: String(
      (settings?.slaFirstResponseSeconds ??
        DEFAULT_SLA_FIRST_RESPONSE_SECONDS) / 60
    ),
    targetPercent: String(
      Math.round((settings?.slaTargetShare ?? DEFAULT_SLA_TARGET_SHARE) * 100)
    ),
  }
}

export function toSettings(draft: Draft): ServiceSettings {
  const businessHours: BusinessHours | null = draft.alwaysOpen
    ? null
    : {
        timezone: draft.timezone.trim(),
        days: draft.days.flatMap((day, index) =>
          day.open
            ? [
                {
                  weekday: index + 1,
                  intervals: [{ start: day.start, end: day.end }],
                },
              ]
            : []
        ),
      }
  return {
    businessHours,
    slaFirstResponseSeconds: Math.round(Number(draft.slaMinutes) * 60),
    slaTargetShare: Number(draft.targetPercent) / 100,
  }
}

export function validate(draft: Draft): string | null {
  const minutes = Number(draft.slaMinutes)
  if (!Number.isFinite(minutes) || minutes < 0.5 || minutes > 1440) {
    return 'El tiempo de respuesta debe estar entre 30 segundos y 24 horas.'
  }
  const target = Number(draft.targetPercent)
  if (!Number.isFinite(target) || target < 50 || target > 99) {
    return 'El objetivo debe estar entre 50 % y 99 %.'
  }
  if (!draft.alwaysOpen) {
    if (!draft.timezone.trim()) return 'Indica la zona horaria.'
    if (!draft.days.some((d) => d.open)) return 'Marca al menos un día laboral.'
    const bad = draft.days.findIndex((d) => d.open && d.start >= d.end)
    if (bad !== -1)
      return `${WEEKDAYS[bad]}: la hora de cierre debe ser posterior a la de apertura.`
  }
  return null
}
