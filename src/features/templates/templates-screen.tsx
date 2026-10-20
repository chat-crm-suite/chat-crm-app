import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listChannels } from '@/services/channel.service'
import {
  channelCapabilities,
  TEMPLATE_STATUSES,
  type SyncTemplatesResult,
  type Template,
  type TemplateGroup,
} from '@chat-crm/contracts'
import { ChevronDown, Eye, EyeOff, RefreshCw, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { matchesText } from '@/lib/commands'
import { cn } from '@/lib/utils'
import { useMemberRole } from '@/hooks/use-member-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChannelChip } from '@/features/chats/components/channel-icon'
import { chatKeys } from '@/features/chats/lib/query-keys'
import { LoadError } from '../workspace/components/load-error'
import { TemplateDetailSheet } from './components/template-detail-sheet'
import {
  TEMPLATE_CATEGORY_LABEL,
  TEMPLATE_STATUS_DOT,
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_TINT,
  copy,
} from './copy'
import type { TemplatesSearch } from './search'
import { useSyncTemplates, useTemplateGroups } from './template-queries'

const ALL = '__all'

type GroupTemplate = TemplateGroup['templates'][number]

const syncedFormat = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function StatusBadge({ status }: { status: GroupTemplate['status'] }) {
  return (
    <Badge
      variant='secondary'
      className={cn(
        'h-5 gap-1 rounded-full text-[11px]',
        TEMPLATE_STATUS_TINT[status]
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', TEMPLATE_STATUS_DOT[status])}
      />
      {TEMPLATE_STATUS_LABEL[status]}
    </Badge>
  )
}

function Visible({ visible }: { visible: boolean }) {
  const Icon = visible ? Eye : EyeOff
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        visible ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <Icon className='size-3.5' aria-hidden />
      {visible ? copy.visibleYes : copy.visibleNo}
    </span>
  )
}

const synced = (date: Date | null) =>
  date ? syncedFormat.format(date) : copy.neverSynced

type Props = {
  search: TemplatesSearch
  onSearchChange: (patch: Partial<TemplatesSearch>) => void
}

/**
 * Body of Plantillas: one row per template name, with every channel where it
 * exists ("Multicanal" when several). Admins sync per channel, check pending
 * templates with the provider and edit CRM settings; others read only.
 */
export function TemplatesScreen({ search, onSearchChange }: Props) {
  const { isAdmin } = useMemberRole()
  const groups = useTemplateGroups()
  const sync = useSyncTemplates()

  const channels = useQuery({
    queryKey: chatKeys.channels,
    queryFn: listChannels,
    staleTime: 60_000,
  })
  const templateChannels = (channels.data ?? []).filter(
    (channel) => channelCapabilities(channel.type)?.supportsTemplates
  )

  const runSync = (channelId: string) =>
    sync.mutate(channelId, {
      onSuccess: (result: SyncTemplatesResult) => {
        toast.success(copy.syncDone(result.total), {
          description: [
            copy.syncSummary(result.created, result.updated, result.disabled),
            ...result.statusChanges.map((change) =>
              copy.statusChanged(change.name, TEMPLATE_STATUS_LABEL[change.to])
            ),
          ].join('\n'),
        })
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, copy.syncError)),
    })

  const visibleGroups = useMemo(() => {
    return (groups.data ?? [])
      .map((group) => ({
        ...group,
        templates: group.templates.filter(
          (template) =>
            (!search.channel || template.channelId === search.channel) &&
            (!search.status || template.status === search.status)
        ),
      }))
      .filter(
        (group) =>
          group.templates.length > 0 &&
          matchesText([group.name], search.q ?? '')
      )
  }, [groups.data, search.channel, search.status, search.q])

  const openTemplate = (id: string) => onSearchChange({ template: id })
  const checkStatus = (template: Pick<Template, 'channelId'>) =>
    runSync(template.channelId)

  const filtering = !!(search.q || search.channel || search.status)

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='max-w-2xl space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{copy.title}</h1>
          <p className='text-muted-foreground text-sm'>{copy.description}</p>
        </div>
        {isAdmin &&
          (templateChannels.length === 1 ? (
            <Button
              className='h-11 sm:h-9'
              disabled={sync.isPending}
              onClick={() => runSync(templateChannels[0].id)}
            >
              <RefreshCw
                className={cn('size-4', sync.isPending && 'animate-spin')}
              />
              {sync.isPending ? copy.syncing : copy.sync}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className='h-11 sm:h-9' disabled={sync.isPending}>
                  <RefreshCw
                    className={cn('size-4', sync.isPending && 'animate-spin')}
                  />
                  {sync.isPending ? copy.syncing : copy.sync}
                  <ChevronDown className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {templateChannels.length === 0 && (
                  <DropdownMenuItem disabled>
                    {copy.syncNoChannels}
                  </DropdownMenuItem>
                )}
                {templateChannels.map((channel) => (
                  <DropdownMenuItem
                    key={channel.id}
                    onSelect={() => runSync(channel.id)}
                  >
                    {copy.syncChannel(channel.name)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative w-full sm:w-64'>
          <SearchIcon
            aria-hidden
            className='text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2'
          />
          <Input
            value={search.q ?? ''}
            onChange={(event) =>
              onSearchChange({ q: event.target.value || undefined })
            }
            placeholder={copy.search}
            aria-label={copy.search}
            className='h-11 ps-8 sm:h-9'
          />
        </div>
        <Select
          value={search.channel ?? ALL}
          onValueChange={(value) =>
            onSearchChange({ channel: value === ALL ? undefined : value })
          }
        >
          <SelectTrigger
            className='h-11 w-full sm:h-9 sm:w-48'
            aria-label={copy.colChannel}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{copy.allChannels}</SelectItem>
            {templateChannels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.status ?? ALL}
          onValueChange={(value) =>
            onSearchChange({
              status:
                value === ALL
                  ? undefined
                  : (value as TemplatesSearch['status']),
            })
          }
        >
          <SelectTrigger
            className='h-11 w-full sm:h-9 sm:w-44'
            aria-label={copy.colStatus}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{copy.allStatuses}</SelectItem>
            {TEMPLATE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {TEMPLATE_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className='bg-card rounded-lg border'>
        {groups.isPending ? (
          <div className='space-y-2 p-4'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : groups.isError ? (
          <LoadError
            title={copy.loadError}
            onRetry={() => void groups.refetch()}
          />
        ) : visibleGroups.length === 0 ? (
          <div className='px-6 py-14 text-center'>
            <p className='text-sm font-medium'>
              {filtering ? copy.noMatches : copy.empty}
            </p>
            {!filtering && (
              <p className='text-muted-foreground mx-auto max-w-sm text-sm'>
                {isAdmin ? copy.emptyAdminHint : copy.emptyAgentHint}
              </p>
            )}
          </div>
        ) : (
          <>
            <Table className='max-md:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colName}</TableHead>
                  <TableHead>{copy.colChannel}</TableHead>
                  <TableHead>{copy.colLanguage}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colVisible}</TableHead>
                  <TableHead>{copy.colSynced}</TableHead>
                  {isAdmin && (
                    <TableHead className='w-12'>
                      <span className='sr-only'>Acciones</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map((group) =>
                  group.templates.map((template, index) => (
                    <TableRow
                      key={template.id}
                      className={cn(
                        'cursor-pointer',
                        index > 0 && 'border-t-0'
                      )}
                      onClick={() => openTemplate(template.id)}
                    >
                      <TableCell className='align-top'>
                        {index === 0 && (
                          <div className='space-y-1'>
                            <button
                              type='button'
                              className='font-mono text-sm font-medium underline-offset-2 hover:underline focus-visible:underline'
                              onClick={(event) => {
                                event.stopPropagation()
                                openTemplate(template.id)
                              }}
                            >
                              {group.name}
                            </button>
                            <div className='flex flex-wrap gap-1'>
                              <Badge
                                variant='outline'
                                className='h-5 text-[11px]'
                              >
                                {TEMPLATE_CATEGORY_LABEL[group.category]}
                              </Badge>
                              {group.multiChannel && (
                                <Badge
                                  variant='secondary'
                                  className='h-5 text-[11px]'
                                >
                                  {copy.multiChannel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChannelChip
                          type={template.channelType}
                          name={template.channelName}
                        />
                      </TableCell>
                      <TableCell className='text-xs uppercase'>
                        {template.language}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={template.status} />
                      </TableCell>
                      <TableCell>
                        <Visible visible={template.visibleToAgents} />
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs tabular-nums'>
                        {synced(template.syncedAt)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {template.status === 'pending' && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8'
                              title={copy.checkStatus}
                              aria-label={`${copy.checkStatus}: ${group.name}`}
                              disabled={sync.isPending}
                              onClick={(event) => {
                                event.stopPropagation()
                                checkStatus(template)
                              }}
                            >
                              <RefreshCw className='size-4' />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <ul className='divide-y md:hidden'>
              {visibleGroups.map((group) => (
                <li key={group.name} className='space-y-2 px-4 py-3'>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <span className='font-mono text-sm font-medium'>
                      {group.name}
                    </span>
                    {group.multiChannel && (
                      <Badge variant='secondary' className='h-5 text-[11px]'>
                        {copy.multiChannel}
                      </Badge>
                    )}
                  </div>
                  <ul className='space-y-1'>
                    {group.templates.map((template) => (
                      <li key={template.id}>
                        <button
                          type='button'
                          onClick={() => openTemplate(template.id)}
                          className='hover:bg-accent flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-start'
                        >
                          <ChannelChip
                            type={template.channelType}
                            name={template.channelName}
                          />
                          <StatusBadge status={template.status} />
                          <span className='text-muted-foreground text-xs uppercase'>
                            {template.language}
                          </span>
                          <Visible visible={template.visibleToAgents} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <TemplateDetailSheet
        templateId={search.template ?? null}
        onOpenChange={(open) => {
          if (!open) onSearchChange({ template: undefined })
        }}
        isAdmin={isAdmin}
        onCheckStatus={checkStatus}
        checking={sync.isPending}
      />
    </div>
  )
}
