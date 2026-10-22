import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { getAssignmentHistory } from '@/services/chat.service'
import type { AssignmentReason } from '@chat-crm/contracts'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '../../copy'
import { chatKeys } from '../../lib/query-keys'
import { MemberAvatar } from '../member-avatar'

const REASON_LABEL: Record<AssignmentReason, string> = {
  auto: 'Automática',
  claim: 'Tomado',
  manual: 'Asignado',
  transfer: 'Transferido',
  escalation: 'Escalado',
  release: 'Liberado',
}

const stamp = (date: Date) => format(date, 'd MMM, HH:mm', { locale: es })

/** Who owned the conversation, when, why, and the transfer notes. */
export function AssignmentHistoryDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const history = useQuery({
    queryKey: chatKeys.assignments(conversationId),
    queryFn: () => getAssignmentHistory(conversationId),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{copy.assignmentHistory}</DialogTitle>
          <DialogDescription className='sr-only'>
            Responsables de esta conversación, del más reciente al más antiguo.
          </DialogDescription>
        </DialogHeader>
        {history.isPending ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : history.isError ? (
          <p role='alert' className='text-muted-foreground text-sm'>
            {copy.historyError}
          </p>
        ) : history.data.length === 0 ? (
          <p className='text-muted-foreground text-sm'>{copy.historyEmpty}</p>
        ) : (
          <ol className='max-h-[60dvh] space-y-0 overflow-y-auto'>
            {history.data.map((entry) => (
              <li
                key={entry.id}
                className='relative flex gap-3 border-s ps-4 pb-4 last:pb-0'
              >
                <span
                  aria-hidden
                  className='bg-border absolute -start-[5px] top-1.5 size-2.5 rounded-full'
                />
                <MemberAvatar name={entry.memberName} className='size-7' />
                <div className='min-w-0 flex-1 space-y-1'>
                  <p className='flex flex-wrap items-center gap-1.5 text-sm'>
                    <span className='font-medium'>{entry.memberName}</span>
                    <Badge variant='outline' className='h-5 text-[11px]'>
                      {REASON_LABEL[entry.reason]}
                    </Badge>
                    {!entry.unassignedAt && (
                      <Badge variant='secondary' className='h-5 text-[11px]'>
                        {copy.historyActive}
                      </Badge>
                    )}
                  </p>
                  <p className='text-muted-foreground text-xs tabular-nums'>
                    {stamp(entry.assignedAt)}
                    {entry.unassignedAt && ` → ${stamp(entry.unassignedAt)}`}
                  </p>
                  {entry.note && (
                    <p className='bg-muted/60 rounded-md px-2.5 py-1.5 text-xs'>
                      {entry.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}
