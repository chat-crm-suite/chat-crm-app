import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getServiceSettings,
  updateServiceSettings,
} from '@/services/service-settings.service'
import { toast } from 'sonner'
import { useMemberRole } from '@/hooks/use-member-role'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  toDraft,
  toSettings,
  validate,
  WEEKDAYS,
  type DayDraft,
  type Draft,
} from './service-settings-draft'

const SERVICE_SETTINGS_KEY = ['company', 'service-settings'] as const

/**
 * Business clock + first-response SLA. Every analytics duration is measured
 * on this clock, so a Saturday-night message does not count against agents.
 */
export function ServiceSettingsForm() {
  const { isAdmin } = useMemberRole()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: SERVICE_SETTINGS_KEY,
    queryFn: getServiceSettings,
  })
  const [draft, setDraft] = useState<Draft>(() => toDraft(undefined))

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data))
  }, [query.data])

  const save = useMutation({
    mutationFn: () => updateServiceSettings(toSettings(draft)),
    onSuccess: (settings) => {
      queryClient.setQueryData(SERVICE_SETTINGS_KEY, settings)
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Horario y tiempo de respuesta guardados.')
    },
    onError: () => toast.error('No se pudo guardar. Revisa los valores.'),
  })

  if (query.isPending) {
    return <Skeleton className='h-64 w-full' />
  }
  if (query.isError) {
    return (
      <p className='text-muted-foreground text-sm'>
        No se pudo cargar la configuración.{' '}
        <Button
          variant='link'
          className='h-auto p-0'
          onClick={() => void query.refetch()}
        >
          Reintentar
        </Button>
      </p>
    )
  }

  const error = validate(draft)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setDay = (index: number, patch: Partial<DayDraft>) =>
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    }))

  return (
    <form
      className='max-w-xl space-y-8'
      onSubmit={(event) => {
        event.preventDefault()
        if (!error) save.mutate()
      }}
    >
      <fieldset disabled={!isAdmin} className='space-y-4'>
        <legend className='mb-2 font-medium'>Primera respuesta</legend>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='grid gap-1.5'>
            <Label htmlFor='sla-minutes'>Tiempo máximo (minutos)</Label>
            <Input
              id='sla-minutes'
              type='number'
              min={0.5}
              step={0.5}
              inputMode='decimal'
              value={draft.slaMinutes}
              onChange={(e) => set({ slaMinutes: e.target.value })}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='sla-target'>Objetivo (% de casos a tiempo)</Label>
            <Input
              id='sla-target'
              type='number'
              min={50}
              max={99}
              inputMode='numeric'
              value={draft.targetPercent}
              onChange={(e) => set({ targetPercent: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={!isAdmin} className='space-y-4'>
        <legend className='mb-2 font-medium'>Horario laboral</legend>
        <div className='flex items-center gap-3'>
          <Switch
            id='always-open'
            checked={draft.alwaysOpen}
            onCheckedChange={(checked) => set({ alwaysOpen: checked })}
          />
          <Label htmlFor='always-open' className='font-normal'>
            Atendemos todo el día, todos los días
          </Label>
        </div>

        {!draft.alwaysOpen && (
          <>
            <div className='grid gap-1.5'>
              <Label htmlFor='timezone'>Zona horaria</Label>
              <Input
                id='timezone'
                value={draft.timezone}
                onChange={(e) => set({ timezone: e.target.value })}
                placeholder='America/Lima'
              />
            </div>
            <ul className='space-y-2'>
              {WEEKDAYS.map((name, index) => {
                const day = draft.days[index]
                return (
                  <li
                    key={name}
                    className='grid grid-cols-[8rem_1fr] items-center gap-3 sm:grid-cols-[8rem_7rem_7rem]'
                  >
                    <div className='flex items-center gap-2'>
                      <Checkbox
                        id={`day-${index}`}
                        checked={day.open}
                        onCheckedChange={(checked) =>
                          setDay(index, { open: checked === true })
                        }
                      />
                      <Label htmlFor={`day-${index}`} className='font-normal'>
                        {name}
                      </Label>
                    </div>
                    {day.open ? (
                      <>
                        <Input
                          type='time'
                          aria-label={`${name}: apertura`}
                          value={day.start}
                          onChange={(e) =>
                            setDay(index, { start: e.target.value })
                          }
                        />
                        <Input
                          type='time'
                          aria-label={`${name}: cierre`}
                          value={day.end}
                          onChange={(e) =>
                            setDay(index, { end: e.target.value })
                          }
                        />
                      </>
                    ) : (
                      <span className='text-muted-foreground text-sm'>
                        Cerrado
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </fieldset>

      {isAdmin ? (
        <div className='space-y-2'>
          {error && (
            <p role='alert' className='text-destructive text-sm'>
              {error}
            </p>
          )}
          <Button type='submit' disabled={!!error || save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar horario'}
          </Button>
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          Solo un administrador puede cambiar el horario y el tiempo de
          respuesta.
        </p>
      )}
    </form>
  )
}
