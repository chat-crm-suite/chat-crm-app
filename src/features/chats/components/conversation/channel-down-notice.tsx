import { Link } from '@tanstack/react-router'
import { RefreshCw, Settings, Unplug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { copy } from '../../copy'
import type { ChannelHealth } from '../../lib/channel-health'

/**
 * The composer's channel-down state: the conversation's channel is not
 * connected (`error`, `pending`, `inactive`), so nothing can be sent. Admins
 * get the settings link; everyone can retry the verification, the only way
 * back besides fixing the credentials (no periodic checks).
 */
export function ChannelDownNotice({
  health,
  canConfigure,
  onRetry,
  retrying,
  className,
}: {
  health: ChannelHealth
  canConfigure: boolean
  /** Absent when the channel type has no verification endpoint. */
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div
      role='alert'
      className={cn(
        'border-destructive/40 bg-destructive/10 flex items-center gap-3 rounded-xl border p-3',
        'max-sm:flex-col max-sm:items-stretch',
        className
      )}
    >
      <div className='flex min-w-0 flex-1 items-start gap-2.5'>
        <span className='bg-destructive/15 text-destructive flex size-7 shrink-0 items-center justify-center rounded-full'>
          <Unplug className='size-4' aria-hidden />
        </span>
        <div className='min-w-0 space-y-0.5'>
          <p className='text-sm font-medium'>
            {health.status === 'pending'
              ? copy.channelPendingTitle(health.name)
              : copy.channelDownTitle(health.name)}
          </p>
          <p className='text-muted-foreground text-xs'>
            {health.reason} {copy.channelDownBody}
          </p>
          {!canConfigure && (
            <p className='text-muted-foreground text-xs'>
              {copy.channelDownAgentHint}
            </p>
          )}
        </div>
      </div>
      <div className='flex shrink-0 gap-2 max-sm:flex-col'>
        {onRetry && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-11 rounded-full px-4 text-xs sm:h-8 sm:px-3'
            onClick={onRetry}
            disabled={retrying}
          >
            <RefreshCw
              className={cn('size-3.5', retrying && 'animate-spin')}
              aria-hidden
            />
            {retrying ? copy.retryingVerification : copy.retryVerification}
          </Button>
        )}
        {canConfigure && health.settingsPath && (
          <Button
            asChild
            size='sm'
            className='h-11 rounded-full px-4 text-xs sm:h-8 sm:px-3'
          >
            <Link to={health.settingsPath}>
              <Settings className='size-3.5' aria-hidden />
              {copy.goToSettings}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
