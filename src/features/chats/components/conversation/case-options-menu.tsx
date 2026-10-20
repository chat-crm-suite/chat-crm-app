import { CONVERSATION_PRIORITIES } from '@chat-crm/contracts'
import {
  CircleCheck,
  Contact,
  Flag,
  History,
  Hourglass,
  ListPlus,
  MoreVertical,
  NotebookPen,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PRIORITY_LABEL, copy } from '../../copy'
import type {
  ConversationPriority,
  ConversationStatus,
} from '../../types/chat.domain'

export type CaseOptionsMenuProps = {
  status: ConversationStatus
  priority: ConversationPriority | null
  /** Owner, admin or supervisor: the lifecycle items are offered. */
  canChangeStatus: boolean
  onCreateTask: () => void
  onShowHistory: () => void
  onViewContact: () => void
  onResolve: () => void
  onResolveWithNote: () => void
  onSetPending: () => void
  onReopen: () => void
  onSetPriority: (priority: ConversationPriority | null) => void
}

/**
 * ⋮ menu of the case header. On phones it also carries the lifecycle actions,
 * since the `Resolver ▾` split button yields its slot there. Priority is
 * editable by whoever may change the status.
 */
export function CaseOptionsMenu({
  status,
  priority,
  canChangeStatus,
  onCreateTask,
  onShowHistory,
  onViewContact,
  onResolve,
  onResolveWithNote,
  onSetPending,
  onReopen,
  onSetPriority,
}: CaseOptionsMenuProps) {
  const resolved = status === 'closed' || status === 'archived'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-11 sm:size-8'
          aria-label={copy.moreActions}
        >
          <MoreVertical className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        {canChangeStatus && (
          <div className='sm:hidden'>
            {resolved ? (
              <DropdownMenuItem onSelect={onReopen} className='min-h-11'>
                <RotateCcw />
                {copy.reopen}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onSelect={onResolve} className='min-h-11'>
                  <CircleCheck />
                  {copy.resolve}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={onResolveWithNote}
                  className='min-h-11'
                >
                  <NotebookPen />
                  {copy.resolveWithNote}
                </DropdownMenuItem>
                {status === 'pending' ? (
                  <DropdownMenuItem onSelect={onReopen} className='min-h-11'>
                    <Play />
                    {copy.resume}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={onSetPending}
                    className='min-h-11'
                  >
                    <Hourglass />
                    {copy.setPending}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
          </div>
        )}
        <DropdownMenuItem onSelect={onCreateTask} className='max-sm:min-h-11'>
          <ListPlus />
          {copy.createTask}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className='max-sm:min-h-11'>
            <Flag className='text-muted-foreground me-2 size-4' />
            {copy.priority}
            {priority && (
              <span className='text-muted-foreground ms-auto ps-2 text-xs'>
                {PRIORITY_LABEL[priority]}
              </span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {CONVERSATION_PRIORITIES.map((value) => (
              <DropdownMenuItem
                key={value}
                disabled={!canChangeStatus}
                onSelect={() => value !== priority && onSetPriority(value)}
              >
                {PRIORITY_LABEL[value]}
                {value === priority && (
                  <span className='ms-auto text-xs'>✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!canChangeStatus || priority === null}
              onSelect={() => onSetPriority(null)}
            >
              {copy.priorityNone}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={onShowHistory} className='max-sm:min-h-11'>
          <History />
          {copy.assignmentHistory}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onViewContact} className='max-sm:min-h-11'>
          <Contact />
          {copy.viewContact}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
