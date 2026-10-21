import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listChannels } from '@/services/channel.service'
import {
  searchCompanyMembers,
  startConversation,
} from '@/services/chat.service'
import {
  channelCapabilities,
  StartConversationSchema,
  type ChannelResponse,
  type Template,
} from '@chat-crm/contracts'
import { Check, Clock3, User } from 'lucide-react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useMemberRole } from '@/hooks/use-member-role'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  templateParams,
  useTemplateParams,
} from '@/features/templates/components/template-fields'
import { useTemplateHeaderMedia } from '@/features/templates/components/template-header-media-field'
import { TemplateComposer } from '@/features/templates/components/template-picker'
import { api } from '../api'
import { useChats } from '../contexts/chats.context'
import { copy as chatCopy } from '../copy'
import { memberDisplayName } from '../hooks/use-conversation-lifecycle'
import { findCachedChat } from '../lib/chat-cache'
import { conversationErrorMessage } from '../lib/conversation-errors'
import { chatKeys } from '../lib/query-keys'
import type { Client } from '../types/client.api'
import { ChannelIcon } from './channel-icon'

/** Search settles for this long before hitting the customers endpoint. */
export const CONTACT_SEARCH_DEBOUNCE_MS = 250

type Step = 'contact' | 'channel' | 'template' | 'assign'

const STEP_LABEL: Record<Step, string> = {
  contact: 'Contacto',
  channel: 'Canal',
  template: 'Plantilla',
  assign: 'Asignar',
}

const copy = {
  title: 'Nuevo chat',
  description:
    'Elige el contacto y el canal; si la ventana está cerrada, envía una plantilla.',
  searchContact: 'Buscar por nombre o teléfono…',
  noContacts: 'Ningún contacto coincide.',
  contactsError: 'No se pudieron cargar los contactos.',
  windowOpen: 'Ventana abierta: puedes escribir libremente',
  windowClosed: 'Sin ventana abierta: requiere plantilla',
  noTemplates:
    'Este canal no admite plantillas: solo puedes responder si el cliente escribe primero.',
  noChannels: 'No hay canales activos. Configura uno en Ajustes.',
  templateRequired: 'La ventana está cerrada: elige una plantilla aprobada.',
  templateOptional: 'La ventana está abierta: la plantilla es opcional.',
  skipTemplate: 'Sin plantilla',
  assignTo: 'Asignar a',
  me: 'A mí',
  createTask: 'Crear tarea de seguimiento',
  taskTitle: 'Título de la tarea',
  taskDue: 'Fecha límite (opcional)',
  back: 'Atrás',
  next: 'Continuar',
  start: 'Iniciar chat',
  starting: 'Iniciando…',
  started: 'Chat iniciado',
  reused: 'Ya existía un chat con este contacto: lo abrimos',
  startError: 'No se pudo iniciar el chat.',
  missingVariables: 'Completa las variables de la plantilla.',
}

const customerName = (client: Client) =>
  client.displayName ||
  [client.firstName, client.lastName].filter(Boolean).join(' ') ||
  parsePhoneNumber(client.phoneNumber ?? '', 'PE')?.formatInternational() ||
  client.phoneNumber ||
  chatCopy.unknownCustomer

/** Steps the dialog walks through for this member and channel set. */
export function newChatSteps({
  channelCount,
  supportsTemplates,
  canSupervise,
}: {
  channelCount: number
  supportsTemplates: boolean
  canSupervise: boolean
}): Step[] {
  return [
    'contact',
    ...(channelCount > 1 ? (['channel'] as const) : []),
    ...(supportsTemplates ? (['template'] as const) : []),
    ...(canSupervise ? (['assign'] as const) : []),
  ]
}

function Stepper({ steps, current }: { steps: Step[]; current: Step }) {
  const index = steps.indexOf(current)
  return (
    <ol className='flex items-center gap-2 text-xs' aria-label='Pasos'>
      {steps.map((step, position) => (
        <li
          key={step}
          aria-current={step === current ? 'step' : undefined}
          className='flex items-center gap-2'
        >
          <span
            className={cn(
              'grid size-5 place-items-center rounded-full text-[10px] font-semibold',
              position < index
                ? 'bg-primary text-primary-foreground'
                : position === index
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {position < index ? <Check className='size-3' /> : position + 1}
          </span>
          <span
            className={cn(
              position === index ? 'font-medium' : 'text-muted-foreground',
              'max-sm:sr-only'
            )}
          >
            {STEP_LABEL[step]}
          </span>
          {position < steps.length - 1 && (
            <span aria-hidden className='bg-border h-px w-4 sm:w-6' />
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * "Nuevo chat": contact → channel (only with several) → template (required
 * while the reply window is closed) → assign + follow-up task (admins and
 * supervisors). One `POST /conversations/start` does it all in a transaction;
 * an existing conversation of that contact and channel is reused.
 */
export function ClientChatDialog() {
  const queryClient = useQueryClient()
  const { canSupervise, memberId } = useMemberRole()
  const {
    setChatSelected,
    setMobile,
    searchClientDialog,
    setSearchClientDialog,
  } = useChats()

  const [step, setStep] = useState<Step>('contact')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, CONTACT_SEARCH_DEBOUNCE_MS)
  const [client, setClient] = useState<Client | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const {
    params,
    setParam,
    missing,
    reset: resetParams,
  } = useTemplateParams(template)
  const header = useTemplateHeaderMedia(template)
  const [assignee, setAssignee] = useState<string>('')
  const [withTask, setWithTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  const open = searchClientDialog

  const clients = useQuery({
    queryKey: ['clients', debouncedSearch],
    queryFn: () => api.queries.clients.search(debouncedSearch),
    enabled: open,
    placeholderData: (prev) => prev,
  })

  const channels = useQuery({
    queryKey: chatKeys.channels,
    queryFn: listChannels,
    enabled: open,
    staleTime: 60_000,
  })
  const activeChannels = useMemo(
    () =>
      (channels.data ?? []).filter((channel) => channel.status === 'active'),
    [channels.data]
  )

  const members = useQuery({
    queryKey: chatKeys.members(''),
    queryFn: () => searchCompanyMembers('', { withWorkload: true }),
    enabled: open && canSupervise,
    staleTime: 15_000,
  })

  // A single active channel is picked for the member.
  useEffect(() => {
    if (!channelId && activeChannels.length === 1) {
      setChannelId(activeChannels[0].id)
    }
  }, [activeChannels, channelId])

  const channel = activeChannels.find((item) => item.id === channelId) ?? null
  const capabilities = channelCapabilities(channel?.type)
  // Until a channel is known, keep the template step in the plan so the step
  // count does not jump once the channels load.
  const supportsTemplates = channel ? !!capabilities?.supportsTemplates : true

  /** Open window = a listed conversation with this contact + channel. */
  const windowOpenFor = (target: ChannelResponse | null) => {
    if (!client || !target) return false
    const capabilitiesOf = channelCapabilities(target.type)
    if (!capabilitiesOf?.replyWindowMs) return true
    const cached = findCachedChat(
      queryClient,
      (chat) => chat.customer.id === client.id && chat.channel?.id === target.id
    )
    return (
      !!cached?.windowExpiresAt &&
      new Date(cached.windowExpiresAt).getTime() > Date.now()
    )
  }
  const windowOpen = windowOpenFor(channel)
  const templateRequired = !windowOpen

  const steps = newChatSteps({
    channelCount: activeChannels.length,
    supportsTemplates,
    canSupervise,
  })
  const position = Math.max(steps.indexOf(step), 0)
  const isLast = position === steps.length - 1

  const resetAll = () => {
    setStep('contact')
    setSearchTerm('')
    setClient(null)
    setChannelId(null)
    setTemplate(null)
    resetParams()
    header.clear()
    setAssignee('')
    setWithTask(false)
    setTaskTitle('')
    setTaskDue('')
  }

  const start = useMutation({
    mutationFn: () => {
      if (!client || !channel) throw new Error('missing contact or channel')
      return startConversation(
        StartConversationSchema.parse({
          customerId: client.id,
          channelId: channel.id,
          ...(canSupervise && assignee && assignee !== memberId
            ? { assigneeMemberId: assignee }
            : {}),
          ...(template
            ? {
                template: {
                  templateId: template.id,
                  params: templateParams(template, params),
                  headerMedia: header.headerMedia,
                  cards: header.cards,
                },
              }
            : {}),
          ...(canSupervise && withTask && taskTitle.trim()
            ? {
                task: {
                  title: taskTitle,
                  ...(taskDue ? { dueAt: new Date(taskDue) } : {}),
                },
              }
            : {}),
        })
      )
    },
    onSuccess: (result) => {
      toast.success(result.created ? copy.started : copy.reused)
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists })
      void queryClient.invalidateQueries({ queryKey: ['work-queue'] })
      if (result.taskId)
        void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // Open it only when it stays mine; assigned to someone else, the
      // supervisor still lands on it (they can see every chat).
      setChatSelected(result.conversation)
      setMobile(true)
      setSearchClientDialog(false)
      resetAll()
    },
    onError: (error) =>
      toast.error(conversationErrorMessage(error, copy.startError)),
  })

  const blocked = (() => {
    switch (step) {
      case 'contact':
        return !client
      case 'channel':
        return !channel || (templateRequired && !supportsTemplates)
      case 'template':
        return templateRequired
          ? !template || missing.length > 0 || header.missing
          : !!template && (missing.length > 0 || header.missing)
      case 'assign':
        return withTask && !taskTitle.trim()
    }
  })()
  // Nothing to send without a window and without templates.
  const dead = !!channel && templateRequired && !supportsTemplates

  const noChannel = channels.isSuccess && activeChannels.length === 0
  // Why there is none: a configured channel that lost its connection.
  const downChannel =
    (channels.data ?? []).find((item) => item.status === 'error') ?? null

  const next = () => {
    if (blocked || dead || (isLast && !channel)) return
    if (isLast) start.mutate()
    else setStep(steps[position + 1])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setSearchClientDialog(next)
        if (!next) resetAll()
      }}
    >
      <DialogContent className='max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-2xl'>
        <DialogHeader className='gap-3'>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className='sr-only'>
            {copy.description}
          </DialogDescription>
          <Stepper steps={steps} current={steps[position]} />
        </DialogHeader>

        {step === 'contact' && (
          <Command shouldFilter={false} className='rounded-lg border'>
            <CommandInput
              placeholder={copy.searchContact}
              className='text-foreground'
              onValueChange={setSearchTerm}
              value={searchTerm}
            />
            <CommandList className='max-h-72'>
              <CommandEmpty>
                {clients.isError ? copy.contactsError : copy.noContacts}
              </CommandEmpty>
              <CommandGroup>
                {(clients.data ?? []).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() =>
                      setClient((prev) => (prev?.id === item.id ? null : item))
                    }
                    className='flex items-center justify-between gap-2 max-sm:min-h-11'
                  >
                    <div className='flex items-center gap-2'>
                      <Avatar className='size-8'>
                        <AvatarImage
                          src={item.avatarUrl ?? undefined}
                          alt={customerName(item)}
                        />
                        <AvatarFallback className='text-xs'>
                          <User className='size-4' />
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium'>
                          {customerName(item)}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {item.phoneNumber ?? item.email}
                        </span>
                      </div>
                    </div>
                    {client?.id === item.id && <Check className='size-4' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}

        {step === 'channel' && (
          <div role='radiogroup' aria-label='Canal' className='grid gap-2'>
            {activeChannels.length === 0 && (
              <p className='text-muted-foreground text-sm'>{copy.noChannels}</p>
            )}
            {activeChannels.map((item) => {
              const selected = item.id === channelId
              const open = windowOpenFor(item)
              return (
                <button
                  key={item.id}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  onClick={() => {
                    setChannelId(item.id)
                    setTemplate(null)
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-start',
                    'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-accent'
                  )}
                >
                  <span className='bg-muted grid size-9 place-items-center rounded-full'>
                    <ChannelIcon type={item.type} className='size-4' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium'>
                      {item.name}
                    </span>
                    <span className='text-muted-foreground flex items-center gap-1 text-xs'>
                      <Clock3 className='size-3' aria-hidden />
                      {open ? copy.windowOpen : copy.windowClosed}
                    </span>
                  </span>
                  {selected && <Check className='size-4' aria-hidden />}
                </button>
              )
            })}
          </div>
        )}

        {step === 'template' && (
          <div className='space-y-3'>
            <p
              className={cn(
                'rounded-lg px-3 py-2 text-xs',
                templateRequired
                  ? 'bg-warning/15'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {templateRequired ? copy.templateRequired : copy.templateOptional}
            </p>
            <TemplateComposer
              channelId={channel?.id ?? null}
              selected={template}
              onSelect={setTemplate}
              params={params}
              onParamChange={setParam}
              header={header}
            />
            {!templateRequired && template && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setTemplate(null)}
              >
                {copy.skipTemplate}
              </Button>
            )}
          </div>
        )}

        {step === 'assign' && (
          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='new-chat-assignee'>{copy.assignTo}</Label>
              <Select
                value={assignee || memberId || ''}
                onValueChange={setAssignee}
              >
                <SelectTrigger
                  id='new-chat-assignee'
                  className='h-11 w-full sm:h-9'
                >
                  <SelectValue placeholder={copy.me} />
                </SelectTrigger>
                <SelectContent>
                  {memberId && (
                    <SelectItem value={memberId}>{copy.me}</SelectItem>
                  )}
                  {(members.data ?? [])
                    .filter((member) => member.id !== memberId)
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {memberDisplayName(member)}
                        {member.openConversations !== undefined &&
                          ` · ${chatCopy.workload(
                            member.openConversations,
                            member.maxOpenConversations
                          )}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='new-chat-task'
                checked={withTask}
                onCheckedChange={(checked) => setWithTask(checked === true)}
              />
              <Label htmlFor='new-chat-task' className='font-normal'>
                {copy.createTask}
              </Label>
            </div>
            {withTask && (
              <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]'>
                <div className='space-y-1.5'>
                  <Label htmlFor='new-chat-task-title'>{copy.taskTitle}</Label>
                  <Input
                    id='new-chat-task-title'
                    value={taskTitle}
                    maxLength={160}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    className='h-11 sm:h-9'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='new-chat-task-due'>{copy.taskDue}</Label>
                  <Input
                    id='new-chat-task-due'
                    type='datetime-local'
                    value={taskDue}
                    onChange={(event) => setTaskDue(event.target.value)}
                    className='h-11 sm:h-9'
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(dead || noChannel) && (
          <p role='alert' className='text-destructive text-sm'>
            {noChannel
              ? (downChannel
                  ? `${chatCopy.channelDownTitle(downChannel.name)}: ${
                      downChannel.statusReason ??
                      chatCopy.channelDownFallbackReason
                    } `
                  : '') + copy.noChannels
              : copy.noTemplates}
          </p>
        )}

        <DialogFooter className='gap-2 sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            className='h-11 sm:h-9'
            disabled={position === 0}
            onClick={() => setStep(steps[position - 1])}
          >
            {copy.back}
          </Button>
          <Button
            type='button'
            className='h-11 sm:h-9'
            disabled={
              blocked || dead || (isLast && !channel) || start.isPending
            }
            onClick={next}
          >
            {isLast
              ? start.isPending
                ? copy.starting
                : copy.start
              : copy.next}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
