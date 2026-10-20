import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchCompanyMembers } from '@/services/chat.service'
import type { CompanyMemberResponse } from '@chat-crm/contracts'
import { ArrowLeft, ChevronDown, Inbox, UserRoundCheck } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { ROLE_LABEL } from '@/features/team/copy'
import { copy } from '../../copy'
import { memberDisplayName } from '../../hooks/use-conversation-lifecycle'
import type { CaseActions } from '../../lib/conversation-assignment'
import { chatKeys } from '../../lib/query-keys'
import type { Chat } from '../../types/chat.domain'
import { MemberAvatar } from '../member-avatar'

/** Typing settles for this long before the member search hits the API. */
export const MEMBER_SEARCH_DEBOUNCE_MS = 250

const CHIP =
  'h-11 max-w-44 gap-1.5 rounded-full px-2 text-xs sm:h-8 sm:max-w-52 sm:ps-1 sm:pe-2.5'

export type AssigneePickerProps = {
  chat: Pick<Chat, 'id' | 'assignee'>
  actions: CaseActions
  busy?: boolean
  onTake: () => void
  onRelease: () => void
  onAssign: (member: CompanyMemberResponse) => void
  onTransfer: (member: CompanyMemberResponse, note?: string) => void
}

/** Workload line of a member row: open chats over the effective cap. */
function Workload({ member }: { member: CompanyMemberResponse }) {
  if (member.openConversations === undefined) return null
  const max = member.maxOpenConversations
  const full = !!max && member.openConversations >= max

  return (
    <span
      className={cn(
        'shrink-0 text-[11px] tabular-nums',
        full ? 'text-foreground font-semibold' : 'text-muted-foreground'
      )}
      title={full ? 'Al límite de su capacidad' : undefined}
    >
      {copy.workload(member.openConversations, max)}
    </span>
  )
}

/**
 * Supervisor picker: search (debounced) over the team with presence and
 * workload. A free chat is assigned on select; an owned one goes to a second
 * step to transfer with an optional internal note.
 */
function SupervisorPicker({
  chat,
  busy,
  onTake,
  onRelease,
  onAssign,
  onTransfer,
}: Omit<AssigneePickerProps, 'actions'>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debounced] = useDebounce(search, MEMBER_SEARCH_DEBOUNCE_MS)
  const [target, setTarget] = useState<CompanyMemberResponse | null>(null)
  const [note, setNote] = useState('')
  const owner = chat.assignee

  const members = useQuery({
    queryKey: chatKeys.members(debounced),
    queryFn: () => searchCompanyMembers(debounced, { withWorkload: true }),
    enabled: open,
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })

  const close = () => {
    setOpen(false)
    setTarget(null)
    setNote('')
    setSearch('')
  }

  const pick = (member: CompanyMemberResponse) => {
    if (!owner) {
      onAssign(member)
      close()
      return
    }
    setTarget(member)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={CHIP}
          disabled={busy}
          aria-label={
            owner
              ? `Responsable: ${owner.name}. Cambiar`
              : `${copy.unassigned}. Asignar`
          }
        >
          {owner ? (
            <MemberAvatar name={owner.name} className='size-6' />
          ) : (
            <Inbox className='text-muted-foreground size-3.5' aria-hidden />
          )}
          <span className='hidden truncate sm:inline'>
            {owner?.name ?? copy.unassigned}
          </span>
          <ChevronDown className='text-muted-foreground size-3.5' aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='w-80 p-0 max-sm:w-[calc(100vw-1rem)]'
      >
        {target ? (
          <form
            className='space-y-3 p-3'
            onSubmit={(event) => {
              event.preventDefault()
              onTransfer(target, note)
              close()
            }}
          >
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='Volver'
                onClick={() => setTarget(null)}
              >
                <ArrowLeft className='size-4' />
              </Button>
              <p className='text-sm font-medium'>
                {copy.transferTo(memberDisplayName(target))}
              </p>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor={`transfer-note-${chat.id}`}>
                {copy.noteLabel}
              </Label>
              <Textarea
                id={`transfer-note-${chat.id}`}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={copy.transferNotePlaceholder}
                className='min-h-20 text-sm'
              />
            </div>
            <Button type='submit' className='h-11 w-full sm:h-9'>
              {copy.transfer}
            </Button>
          </form>
        ) : (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={copy.searchMembers}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className='max-h-72'>
              {members.isError ? (
                <p
                  role='alert'
                  className='text-muted-foreground px-3 py-6 text-center text-sm'
                >
                  {copy.membersError}
                </p>
              ) : (
                <CommandEmpty>
                  {members.isPending ? 'Cargando…' : copy.noMembers}
                </CommandEmpty>
              )}
              {!owner && (
                <CommandGroup>
                  <CommandItem
                    value='__take'
                    onSelect={() => {
                      onTake()
                      close()
                    }}
                    className='max-sm:min-h-11'
                  >
                    <UserRoundCheck className='size-4' />
                    {copy.take}
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup
                heading={owner ? copy.transferWithNote : copy.assign}
              >
                {(members.data ?? []).map((member) => {
                  const name = memberDisplayName(member)
                  const current = member.id === owner?.memberId
                  return (
                    <CommandItem
                      key={member.id}
                      value={member.id}
                      disabled={current}
                      onSelect={() => pick(member)}
                      className='gap-2.5 max-sm:min-h-11'
                    >
                      <MemberAvatar name={name} presence={member.presence} />
                      <span className='flex min-w-0 flex-1 flex-col'>
                        <span className='truncate text-sm'>{name}</span>
                        <span className='text-muted-foreground text-[11px]'>
                          {current
                            ? 'Responsable actual'
                            : ROLE_LABEL[member.role]}
                        </span>
                      </span>
                      <Workload member={member} />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {owner && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value='__release'
                      onSelect={() => {
                        onRelease()
                        close()
                      }}
                      className='max-sm:min-h-11'
                    >
                      <Inbox className='size-4' />
                      {copy.release}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Owner chip of the case header. Agents only take a queued chat or release
 * their own; admins and supervisors get the full picker (assign, transfer
 * with note, release to the queue).
 */
export function AssigneePicker(props: AssigneePickerProps) {
  const { chat, actions, busy, onTake, onRelease } = props

  if (actions.canAssignOthers) return <SupervisorPicker {...props} />

  if (actions.canTake) {
    return (
      <Button
        type='button'
        size='sm'
        className='h-11 rounded-full px-4 text-xs sm:h-8 sm:px-3'
        onClick={onTake}
        disabled={busy}
      >
        {busy ? copy.taking : copy.take}
      </Button>
    )
  }

  const owner = chat.assignee
  if (!owner) return null

  if (actions.canRelease) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className={CHIP}
            disabled={busy}
            aria-label='Asignado a ti. Opciones'
          >
            <MemberAvatar name={owner.name} className='size-6' />
            <span className='hidden sm:inline'>{copy.you}</span>
            <ChevronDown
              className='text-muted-foreground size-3.5'
              aria-hidden
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>{copy.ownerMe}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onRelease} className='max-sm:min-h-11'>
            <Inbox />
            {copy.release}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <span
      className='text-muted-foreground inline-flex h-8 max-w-44 items-center gap-1.5 rounded-full border px-1 pe-2.5 text-xs'
      title={`Asignado a ${owner.name}`}
    >
      <MemberAvatar name={owner.name} />
      <span className='hidden truncate sm:inline'>{owner.name}</span>
    </span>
  )
}
