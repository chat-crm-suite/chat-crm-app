import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeftRight,
  MessageSquareDot,
  MessageSquareReply,
  type LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCompare } from '@/features/dashboard/clients/metrics.client'

const compareData = (metric: string, period: string) =>
  useQuery({
    queryKey: ['metrics', 'compare', metric],
    queryFn: () => getCompare(metric, period),
    placeholderData: (prev) => prev,
  })

export const KPIs = () => {
  // const { data: kpis } = useQuery({
  //   queryKey: ['metrics', 'kpis'],
  //   queryFn: () => getKpis,
  //   placeholderData: (prev) => prev,
  // })
  const { data: agentData } = compareData('agent', 'week')

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <KPICard
        title='Chat Activos'
        // value={kpis?.activeChats.value ?? 0}
        // porcentLastMonth={kpis?.activeChats.porcentLastMonth ?? '0%'}
        value={agentData?.previus}
        porcentLastMonth={agentData?.porcent}
        icon={MessageSquareDot}
      />
      <KPICard
        title='Mensajes de este mes'
        // value={kpis?.messagesThisMonth.value ?? 0}
        // porcentLastMonth={kpis?.messagesThisMonth.porcentLastMonth ?? '0%'}
        value={agentData?.previus}
        porcentLastMonth={agentData?.porcent}
        icon={MessageSquareReply}
      />
      <KPICard
        title='Agentes activos'
        // value={kpis?.agentsActive.value ?? 0}
        // porcentLastMonth={kpis?.agentsActive.porcentLastMonth ?? '0%'}
        value={agentData?.previus}
        porcentLastMonth={agentData?.porcent}
        icon={Activity}
      />
      <KPICard
        title='Transferencias este mes'
        // value={kpis?.transfersThisMonth?.value ?? 0}
        // porcentLastMonth={kpis?.transfersThisMonth?.porcentLastMonth ?? '0%'}
        value={agentData?.previus}
        porcentLastMonth={agentData?.porcent}
        icon={ArrowLeftRight}
      />
    </div>
  )
}

const KPICard = ({
  title,
  value,
  porcentLastMonth,
  icon,
}: {
  title: string
  value: number | string
  porcentLastMonth: string
  icon: LucideIcon
}) => {
  const Icon: LucideIcon = icon
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <CardTitle className='text-sm font-medium capitalize'>
          {title}
        </CardTitle>
        <Icon size={18} opacity={0.5} />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <CardDescription className='text-muted-foreground text-xs'>
          {`${porcentLastMonth} que el último mes`}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
