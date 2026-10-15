import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getServiceSettings } from '@/services/service-settings.service'
import { CircleCheck, CircleSlash, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toggleIa } from '../clients/ia.client'
import { useReadiness } from '../hooks/use-analytics-queries'
import { IA_STATUS_KEY, type IaAvailability } from '../hooks/use-ia-status'
import { channelMeta } from '../lib/channel-meta'
import { formatDuration, formatPercent } from '../lib/format'
import { WidgetSkeleton } from './widget'

const IA_COPY = {
  active: { label: 'Activo', icon: CircleCheck, className: 'text-sla-ok' },
  disabled: {
    label: 'Desactivado',
    icon: CircleSlash,
    className: 'text-muted-foreground',
  },
  unavailable: {
    label: 'No disponible (servicio caído)',
    icon: TriangleAlert,
    className: 'text-sla-breach',
  },
} as const

/** Admin system status: sentiment IA, channels and the service clock. */
export function SystemPanel({ ia }: { ia: IaAvailability }) {
  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      <IaSection ia={ia} />
      <ChannelsSection />
      <ServiceClockSection />
    </div>
  )
}

function IaSection({ ia }: { ia: IaAvailability }) {
  const queryClient = useQueryClient()
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleIa(enabled),
    onSuccess: ({ enabled }) => {
      toast.success(
        enabled
          ? 'Análisis de sentimiento activado.'
          : 'Análisis de sentimiento desactivado.'
      )
      void queryClient.invalidateQueries({ queryKey: IA_STATUS_KEY })
    },
    onError: () =>
      toast.error('No se pudo cambiar el análisis de sentimiento.'),
  })

  if (!ia.status) return <WidgetSkeleton rows={2} />
  const copy = IA_COPY[ia.status.status]
  const Icon = copy.icon

  return (
    <section className='space-y-3'>
      <h3 className='text-sm font-medium'>Análisis de sentimiento</h3>
      <p className={`flex items-center gap-2 text-sm ${copy.className}`}>
        <Icon className='size-4' aria-hidden />
        {copy.label}
      </p>
      <div className='flex items-center gap-3'>
        <Switch
          id='ia-enabled'
          checked={ia.status.enabled}
          disabled={toggle.isPending}
          onCheckedChange={(checked) => toggle.mutate(checked)}
        />
        <Label htmlFor='ia-enabled' className='font-normal'>
          {ia.status.enabled
            ? 'Analizar el tono de los mensajes'
            : 'Activar el análisis del tono'}
        </Label>
      </div>
      <p className='text-muted-foreground text-xs'>
        Afecta a todas las empresas del servidor. Mientras esté apagado, las
        métricas de tono se ocultan.
      </p>
    </section>
  )
}

function ChannelsSection() {
  const { data } = useReadiness()
  return (
    <section className='space-y-3'>
      <h3 className='text-sm font-medium'>Canales</h3>
      {!data ? (
        <WidgetSkeleton rows={2} />
      ) : data.channels.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          No hay canales conectados.{' '}
          <Link
            to='/settings/integrations/whatsapp'
            className='text-foreground underline'
          >
            Conectar WhatsApp
          </Link>
        </p>
      ) : (
        <ul className='space-y-1.5 text-sm'>
          {data.channels.map((channel) => (
            <li key={channel.channelType} className='flex items-center gap-2'>
              {channel.connected ? (
                <CircleCheck className='text-sla-ok size-4' aria-hidden />
              ) : (
                <TriangleAlert className='text-sla-breach size-4' aria-hidden />
              )}
              {channelMeta[channel.channelType].label}
              <span className='text-muted-foreground'>
                {channel.connected ? 'conectado' : 'con errores'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ServiceClockSection() {
  const { data, isError } = useQuery({
    queryKey: ['company', 'service-settings'],
    queryFn: getServiceSettings,
    staleTime: 60_000,
  })

  return (
    <section className='space-y-3'>
      <h3 className='text-sm font-medium'>Horario y tiempo de respuesta</h3>
      {isError ? (
        <p className='text-muted-foreground text-sm'>
          No se pudo leer la configuración.
        </p>
      ) : !data ? (
        <WidgetSkeleton rows={2} />
      ) : (
        <dl className='space-y-1 text-sm'>
          <div className='flex gap-2'>
            <dt className='text-muted-foreground'>Horario:</dt>
            <dd>
              {data.businessHours
                ? data.businessHours.timezone
                : 'todo el día, todos los días'}
            </dd>
          </div>
          <div className='flex gap-2'>
            <dt className='text-muted-foreground'>Primera respuesta:</dt>
            <dd className='tabular-nums'>
              {formatPercent(data.slaTargetShare)} en menos de{' '}
              {formatDuration(data.slaFirstResponseSeconds)}
            </dd>
          </div>
        </dl>
      )}
      <Button asChild variant='outline' size='sm'>
        <Link to='/settings/service'>Configurar horario</Link>
      </Button>
    </section>
  )
}
