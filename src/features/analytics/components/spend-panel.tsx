import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChannelRate, SpendSummary } from '@chat-crm/contracts'
import { Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  setBillablePause,
  updateBudget,
  updateChannelRates,
} from '../clients/spend.client'
import { useSpendSummary } from '../hooks/use-analytics-queries'
import { channelMeta, chargeCategoryLabel } from '../lib/channel-meta'
import { formatInteger, formatUnitPrice, formatUsd } from '../lib/format'
import { BudgetMeter } from './budget-meter'
import { SpendTrend } from './spend-trend'
import { SufficiencyNote } from './sufficiency-note'
import { WidgetSkeleton } from './widget'

const useInvalidateSpend = () => {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: ['analytics', 'spend'] })
}

/**
 * What the channels cost this month (approximate: billable count × the
 * company's rate table), where it is heading, and the controls to act:
 * rates, budget and pausing billable sends.
 */
export function SpendPanel({ month }: { month?: string }) {
  const { data } = useSpendSummary(month)
  if (!data) return <WidgetSkeleton rows={6} />

  const projection = data.projection
  const willExceed =
    projection !== null &&
    data.budget.monthlyBudgetUsd !== null &&
    projection.highUsd > data.budget.monthlyBudgetUsd

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='space-y-3'>
          <p className='text-muted-foreground text-sm'>Gastado este mes</p>
          <p className='text-[40px] leading-none font-semibold tabular-nums'>
            {formatUsd(data.totalUsd)}
          </p>
          <p className='text-muted-foreground text-sm'>
            {formatInteger(data.billableCount)} mensajes cobrables ·{' '}
            {formatInteger(data.freeCount)} gratuitos
            {data.costPerResolvedCaseUsd !== null && (
              <> · {formatUsd(data.costPerResolvedCaseUsd)} por caso resuelto</>
            )}
          </p>
          <BudgetMeter
            spentUsd={data.totalUsd}
            budgetUsd={data.budget.monthlyBudgetUsd}
            consumedShare={data.budget.consumedShare}
            threshold={data.budget.threshold}
          />
        </div>
        <div className='space-y-2'>
          <div className='text-sm'>
            {projection && projection.meta.status === 'ok' ? (
              <>
                Proyección a fin de mes:{' '}
                <span className='font-semibold tabular-nums'>
                  {formatUsd(projection.lowUsd)} a{' '}
                  {formatUsd(projection.highUsd)}
                </span>
                {willExceed && (
                  <span className='text-sla-breach block text-sm font-medium'>
                    Podría superar el presupuesto.
                  </span>
                )}
              </>
            ) : projection ? (
              <SufficiencyNote
                meta={projection.meta}
                unit='days'
                what='proyectar el mes'
              />
            ) : (
              <span className='text-muted-foreground'>
                La proyección aparece con al menos 3 días de gasto.
              </span>
            )}
          </div>
          <SpendTrend summary={data} />
        </div>
      </div>

      <CategoryTable summary={data} />

      <div className='flex flex-wrap gap-2 border-t pt-4'>
        <RatesDialog rates={data.rates} />
        <BudgetDialog current={data.budget.monthlyBudgetUsd} />
        <PauseButton paused={data.billableSendsPaused} />
      </div>
    </div>
  )
}

function CategoryTable({ summary }: { summary: SpendSummary }) {
  if (summary.byChannel.length === 0) {
    return (
      <p className='text-muted-foreground text-sm'>
        Todavía no hay mensajes con costo registrado este mes. Los mensajes de
        servicio dentro de la ventana de 24 horas son gratuitos.
      </p>
    )
  }
  const multiChannel = summary.byChannel.length > 1

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoría</TableHead>
          <TableHead className='text-end'>Cobrables</TableHead>
          <TableHead className='text-end'>Gratuitos</TableHead>
          <TableHead className='text-end'>Tarifa</TableHead>
          <TableHead className='text-end'>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summary.byChannel.map((channel) => (
          <ChannelRows
            key={channel.channelType}
            channel={channel}
            showHeader={multiChannel}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function ChannelRows({
  channel,
  showHeader,
}: {
  channel: SpendSummary['byChannel'][number]
  showHeader: boolean
}) {
  return (
    <>
      {showHeader && (
        <TableRow className='hover:bg-transparent'>
          <TableCell colSpan={4} className='font-medium'>
            {channelMeta[channel.channelType].label}
          </TableCell>
          <TableCell className='text-end font-medium tabular-nums'>
            {formatUsd(channel.totalUsd)}
          </TableCell>
        </TableRow>
      )}
      {channel.categories.map((category) => (
        <TableRow key={`${channel.channelType}-${category.category}`}>
          <TableCell className={showHeader ? 'ps-6' : undefined}>
            {chargeCategoryLabel(category.category)}
          </TableCell>
          <TableCell className='text-end tabular-nums'>
            {formatInteger(category.billableCount)}
          </TableCell>
          <TableCell className='text-muted-foreground text-end tabular-nums'>
            {formatInteger(category.freeCount)}
          </TableCell>
          <TableCell className='text-end tabular-nums'>
            {formatUnitPrice(category.usdPerUnit)}
          </TableCell>
          <TableCell className='text-end font-medium tabular-nums'>
            {formatUsd(category.totalUsd)}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function RatesDialog({ rates }: { rates: ChannelRate[] }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const invalidate = useInvalidateSpend()
  const keyOf = (rate: ChannelRate) => `${rate.channelType}:${rate.category}`

  const save = useMutation({
    mutationFn: () =>
      updateChannelRates({
        rates: rates.map((rate) => ({
          ...rate,
          usdPerUnit: Number(draft[keyOf(rate)] ?? rate.usdPerUnit),
        })),
      }),
    onSuccess: () => {
      toast.success('Tarifas guardadas.')
      void invalidate()
      setOpen(false)
    },
    onError: () =>
      toast.error('No se pudieron guardar las tarifas. Revisa los valores.'),
  })

  const invalid = Object.values(draft).some(
    (v) => v === '' || Number.isNaN(Number(v)) || Number(v) < 0
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft({})
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' disabled={rates.length === 0}>
          Editar tarifas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarifas por mensaje</DialogTitle>
          <DialogDescription>
            Precio aproximado en USD por mensaje cobrable. Usa las tarifas de tu
            país en la lista de precios del proveedor.
          </DialogDescription>
        </DialogHeader>
        <form
          id='rates-form'
          className='grid gap-3'
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          {rates.map((rate) => {
            const id = `rate-${keyOf(rate)}`
            return (
              <div
                key={id}
                className='grid grid-cols-[1fr_8rem] items-center gap-3'
              >
                <Label htmlFor={id}>
                  {chargeCategoryLabel(rate.category)}
                  {rates.some((r) => r.channelType !== rate.channelType) && (
                    <span className='text-muted-foreground'>
                      {' '}
                      · {channelMeta[rate.channelType].label}
                    </span>
                  )}
                </Label>
                <Input
                  id={id}
                  type='number'
                  inputMode='decimal'
                  step='0.0001'
                  min={0}
                  className='text-end tabular-nums'
                  value={draft[keyOf(rate)] ?? String(rate.usdPerUnit)}
                  onChange={(event) =>
                    setDraft((d) => ({
                      ...d,
                      [keyOf(rate)]: event.target.value,
                    }))
                  }
                />
              </div>
            )
          })}
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='rates-form'
            disabled={invalid || save.isPending}
          >
            {save.isPending ? 'Guardando…' : 'Guardar tarifas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BudgetDialog({ current }: { current: number | null }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const invalidate = useInvalidateSpend()

  const save = useMutation({
    mutationFn: (monthlyBudgetUsd: number | null) =>
      updateBudget({ monthlyBudgetUsd }),
    onSuccess: (_data, budget) => {
      toast.success(
        budget === null ? 'Presupuesto quitado.' : 'Presupuesto guardado.'
      )
      void invalidate()
      setOpen(false)
    },
    onError: () => toast.error('No se pudo guardar el presupuesto.'),
  })

  const parsed = Number(value)
  const valid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setValue(current === null ? '' : String(current))
      }}
    >
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          {current === null ? 'Definir presupuesto' : 'Editar presupuesto'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Presupuesto mensual</DialogTitle>
          <DialogDescription>
            Los administradores reciben un aviso al llegar al 80 % y al 100 %.
            El envío no se detiene solo: lo pausas tú.
          </DialogDescription>
        </DialogHeader>
        <form
          id='budget-form'
          className='grid gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) save.mutate(parsed)
          }}
        >
          <Label htmlFor='budget'>Monto en USD</Label>
          <Input
            id='budget'
            type='number'
            inputMode='decimal'
            min={1}
            step='1'
            className='tabular-nums'
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </form>
        <DialogFooter className='gap-2'>
          {current !== null && (
            <Button
              variant='ghost'
              disabled={save.isPending}
              onClick={() => save.mutate(null)}
            >
              Quitar presupuesto
            </Button>
          )}
          <Button
            type='submit'
            form='budget-form'
            disabled={!valid || save.isPending}
          >
            {save.isPending ? 'Guardando…' : 'Guardar presupuesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PauseButton({ paused }: { paused: boolean }) {
  const invalidate = useInvalidateSpend()
  const toggle = useMutation({
    mutationFn: (next: boolean) => setBillablePause({ paused: next }),
    onSuccess: (_data, next) => {
      toast.success(
        next ? 'Envíos cobrables pausados.' : 'Envíos cobrables reanudados.'
      )
      void invalidate()
    },
    onError: () => toast.error('No se pudo cambiar el estado de los envíos.'),
  })

  if (paused) {
    return (
      <Button
        size='sm'
        disabled={toggle.isPending}
        onClick={() => toggle.mutate(false)}
      >
        <Play className='size-3.5' aria-hidden />
        Reanudar envíos cobrables
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size='sm' variant='destructive' disabled={toggle.isPending}>
          <Pause className='size-3.5' aria-hidden />
          Pausar envíos cobrables
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Pausar los envíos cobrables?</AlertDialogTitle>
          <AlertDialogDescription>
            Los agentes no podrán enviar mensajes que el canal cobra (por
            ejemplo, plantillas fuera de la ventana de 24 horas). Las respuestas
            gratuitas siguen funcionando.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => toggle.mutate(true)}>
            Pausar envíos cobrables
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
