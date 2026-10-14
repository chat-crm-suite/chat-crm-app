import { Link } from '@tanstack/react-router'
import {
  CONTROL_CHART_MIN_POINTS,
  type AnalyticsReadiness,
} from '@chat-crm/contracts'
import { CircleCheck, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { channelMeta } from '../lib/channel-meta'

type WelcomeViewProps = {
  readiness: AnalyticsReadiness
  isAdmin: boolean
}

/**
 * Fresh install: nothing to measure yet. Instead of empty charts, the steps
 * that make the metrics appear, each with its current state.
 */
export function WelcomeView({ readiness, isAdmin }: WelcomeViewProps) {
  const channel = readiness.channels.find((c) => c.connected)
  const steps = [
    {
      done: !!channel,
      label: channel
        ? `Canal conectado: ${channelMeta[channel.channelType].label}`
        : 'Conectar un canal',
    },
    {
      done: readiness.firstMessageReceived,
      label: 'Recibir el primer mensaje',
    },
    {
      done: readiness.businessHoursConfigured,
      label: 'Configurar el horario laboral',
    },
    {
      done: readiness.agentCount > 0,
      label:
        readiness.agentCount > 0
          ? `Agentes en la empresa: ${readiness.agentCount}`
          : 'Invitar a los agentes',
    },
  ]

  return (
    <section className='max-w-2xl space-y-6 py-6'>
      <div className='space-y-2'>
        <h2 className='text-[28px] leading-tight font-semibold'>
          Todavía no hay actividad para medir
        </h2>
        <p className='text-muted-foreground'>
          Las métricas aparecen a medida que llegan conversaciones. Los gráficos
          de tendencia necesitan al menos {CONTROL_CHART_MIN_POINTS} días de
          datos.
        </p>
      </div>
      <ul className='space-y-3'>
        {steps.map((step) => (
          <li key={step.label} className='flex items-center gap-3'>
            {step.done ? (
              <CircleCheck className='text-sla-ok size-5' aria-label='Hecho' />
            ) : (
              <Circle
                className='text-muted-foreground size-5'
                aria-label='Pendiente'
              />
            )}
            <span className={step.done ? undefined : 'text-muted-foreground'}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
      {isAdmin && (
        <div className='flex flex-wrap gap-2'>
          {!channel && (
            <Button asChild>
              <Link to='/settings/integrations/whatsapp'>
                Conectar WhatsApp
              </Link>
            </Button>
          )}
          {!readiness.businessHoursConfigured && (
            <Button asChild variant='outline'>
              <Link to='/settings/service'>Configurar horario</Link>
            </Button>
          )}
          <Button asChild variant='outline'>
            <Link to='/users'>Invitar agentes</Link>
          </Button>
        </div>
      )}
    </section>
  )
}
