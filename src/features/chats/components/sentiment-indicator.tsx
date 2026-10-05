import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SentimentData } from '../types/chat.domain'

interface SentimentIndicatorProps {
  sentiment?: SentimentData
  className?: string
}

const config = {
  POS: {
    color: '--positive',
    emoji: '🟩',
    label: 'Positivo',
    avg: 0,
  },
  NEU: {
    color: '--neutro',
    emoji: '⬜',
    label: 'Neutral',
    avg: 0,
  },
  NEG: {
    color: '--negative',
    emoji: '🟥',
    label: 'Negativo',
    avg: 0,
  },
}

export function SentimentIndicator({ sentiment }: SentimentIndicatorProps) {
  if (!sentiment) return
  const { avgPos, avgNeu, avgNeg, dominant, totalMessages } = sentiment
  const { color, emoji, label } = config[dominant]

  config['POS'].avg = avgPos ?? 0
  config['NEU'].avg = avgNeu ?? 0
  config['NEG'].avg = avgNeg ?? 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1.5 border-[${color}]`}>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={`flex h-8 items-center gap-1 rounded-full border-(${color}) sm:text-base`}
              >
                <span>{emoji}</span>
                <span className='hidden truncate text-xs font-semibold tracking-tight sm:inline'>
                  {label} — Tono emocional
                </span>
              </Badge>
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent
          side='bottom'
          className='bg-background space-y-4 border shadow-lg [&>div]:bg-[var(--bg-background)]'
        >
          <p className='font-semibold'>Análisis de Sentimiento</p>
          <div className='gap-2 space-y-1 text-sm'>
            {Object.values(config).map(({ label, avg, color }) => (
              <div
                className='flex items-center justify-between gap-4'
                key={label}
              >
                <span className='flex items-center'>
                  <span className='h-2 w-2 rounded-full' />
                  {label}
                </span>
                <Progress
                  value={Math.floor(avg * 100)}
                  className={`[&>div]:bg-[var(${color})]`}
                />
              </div>
            ))}
          </div>
          <p className='h-full w-full pt-1 text-center text-xs font-bold'>
            Total de mensajes: {totalMessages}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
