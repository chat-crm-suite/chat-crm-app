import { useState } from 'react'
import {
  ChevronDown,
  CircleCheck,
  Hourglass,
  NotebookPen,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { copy } from '../../copy'
import type { ConversationStatus } from '../../types/chat.domain'

export type ResolveMenuProps = {
  status: ConversationStatus
  /** Owner, admin or supervisor; others see the control disabled. */
  allowed: boolean
  busy?: boolean
  onResolve: (note?: string) => void
  onSetPending: () => void
  onReopen: () => void
}

const NOT_ALLOWED =
  'Solo el responsable o un supervisor puede cambiar el estado'

/** Optional internal note before resolving ("Resolver con nota…"). */
export function ResolveNoteDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onConfirm: (note?: string) => void
}) {
  const [note, setNote] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.resolveTitle}</DialogTitle>
          <DialogDescription>{copy.resolveDescription}</DialogDescription>
        </DialogHeader>
        <form
          id='resolve-note-form'
          className='grid gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            onConfirm(note)
            setNote('')
            onOpenChange(false)
          }}
        >
          <Label htmlFor='resolve-note'>{copy.noteLabel}</Label>
          <Textarea
            id='resolve-note'
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.resolveNotePlaceholder}
          />
        </form>
        <DialogFooter>
          <Button type='submit' form='resolve-note-form' disabled={busy}>
            {busy ? copy.resolving : copy.resolve}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * `Resolver ▾` split button of the case header. The main half resolves right
 * away (the toast offers Reabrir as undo); the menu holds the note variant and
 * the hold toggle. A resolved conversation shows Reabrir instead. Phones get
 * the same actions from the ⋮ menu, so this control yields its slot there.
 */
export function ResolveMenu({
  status,
  allowed,
  busy = false,
  onResolve,
  onSetPending,
  onReopen,
}: ResolveMenuProps) {
  const [noteOpen, setNoteOpen] = useState(false)
  const title = allowed ? undefined : NOT_ALLOWED

  if (status === 'closed' || status === 'archived') {
    return (
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-8 rounded-full px-3 text-xs max-sm:hidden'
        disabled={!allowed || busy}
        title={title}
        onClick={onReopen}
      >
        <RotateCcw className='size-3.5' />
        {busy ? copy.reopening : copy.reopen}
      </Button>
    )
  }

  return (
    <>
      <ButtonGroup className='max-sm:hidden'>
        <Button
          type='button'
          size='sm'
          className='h-8 rounded-s-full ps-3 pe-2.5 text-xs'
          disabled={!allowed || busy}
          title={title}
          onClick={() => onResolve()}
        >
          <CircleCheck className='size-3.5' />
          {busy ? copy.resolving : copy.resolve}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              size='sm'
              className='border-primary-foreground/15 h-8 rounded-e-full border-s px-2'
              disabled={!allowed || busy}
              aria-label='Más opciones de estado'
            >
              <ChevronDown className='size-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
              <NotebookPen />
              {copy.resolveWithNote}
            </DropdownMenuItem>
            {status === 'pending' ? (
              <DropdownMenuItem onSelect={onReopen}>
                <Play />
                {copy.resume}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onSetPending}>
                <Hourglass />
                {copy.setPending}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <ResolveNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        busy={busy}
        onConfirm={onResolve}
      />
    </>
  )
}
