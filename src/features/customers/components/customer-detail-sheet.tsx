import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { CustomerRow, Tag } from '@chat-crm/contracts'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Chip, MonogramAvatar, RelativeTime } from '@/components/data-grid'
import { SOURCE_LABEL, copy } from '../copy'
import {
  avatarName,
  customerErrorMessage,
  customerName,
  useSetCustomerTags,
  useStages,
  useUpdateCustomer,
} from '../customers-data'
import { OwnerPicker } from './owner-picker'
import { StageSelect } from './stage-select'
import { TagEditor } from './tag-editor'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='space-y-3'>
      <h3 className='text-base font-semibold'>{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[8.5rem_1fr] items-center gap-3 text-sm'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='min-w-0'>{children}</dd>
    </div>
  )
}

type Props = {
  /** Customer to show; `undefined` while it is being found. */
  customer: CustomerRow | undefined
  isLoading: boolean
  notFound: boolean
  canSupervise: boolean
  onClose: () => void
  onEdit: (customer: CustomerRow) => void
  onRemove: (customer: CustomerRow) => void
}

/**
 * Everything about one customer in a side sheet: contact data, the two things
 * that move a customer along (owner and stage) as inline selects, tags with
 * create-on-enter, and the way into the open conversation.
 */
export function CustomerDetailSheet({
  customer,
  isLoading,
  notFound,
  canSupervise,
  onClose,
  onEdit,
  onRemove,
}: Props) {
  const stages = useStages()
  const update = useUpdateCustomer()
  const setTags = useSetCustomerTags()

  const patch = async (
    input: { ownerMemberId?: string | null; pipelineStageId?: string | null }
  ) => {
    if (!customer) return
    try {
      await update.mutateAsync({ id: customer.id, input })
      toast.success(copy.detail.updated)
    } catch (error) {
      toast.error(customerErrorMessage(error))
    }
  }

  const changeTags = async (tags: Tag[]) => {
    if (!customer) return
    try {
      await setTags.mutateAsync({ customer, tags })
    } catch (error) {
      toast.error(customerErrorMessage(error))
    }
  }

  const name = customer ? customerName(customer) : ''
  const open = customer?.openConversation

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]'>
        <SheetHeader className='border-b px-6 py-5 text-start'>
          {customer ? (
            <>
              <div className='flex items-center gap-3 pe-8'>
                <MonogramAvatar
                  size='lg'
                  name={avatarName(customer)}
                  fallback={customer.phoneNumber}
                  tintKey={customer.id}
                  src={customer.avatarUrl}
                />
                <div className='min-w-0 space-y-1'>
                  <SheetTitle className='truncate text-lg'>{name}</SheetTitle>
                  <SheetDescription className='flex items-center gap-2'>
                    {customer.phoneNumber && name !== customer.phoneNumber
                      ? customer.phoneNumber
                      : null}
                    <Chip>{SOURCE_LABEL[customer.source]}</Chip>
                  </SheetDescription>
                </div>
              </div>
              <div className='flex flex-wrap gap-2 pt-3'>
                <Button size='sm' variant='outline' onClick={() => onEdit(customer)}>
                  <Pencil aria-hidden />
                  {copy.detail.edit}
                </Button>
                {canSupervise ? (
                  <Button
                    size='sm'
                    variant='outline'
                    className='text-destructive hover:text-destructive'
                    onClick={() => onRemove(customer)}
                  >
                    <Trash2 aria-hidden />
                    {copy.detail.remove}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <SheetTitle className='text-lg'>
                {isLoading
                  ? 'Cargando cliente…'
                  : notFound
                    ? copy.detail.notFound
                    : copy.title}
              </SheetTitle>
              <SheetDescription>
                {notFound ? copy.detail.notFoundHint : ' '}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className='flex-1 space-y-8 overflow-y-auto px-6 py-6'>
          {customer ? (
            <>
              <Section title={copy.detail.follow}>
                <dl className='space-y-3'>
                  <Row label={copy.detail.stage}>
                    <StageSelect
                      aria-label={copy.detail.stage}
                      stages={stages.data ?? []}
                      value={customer.stage?.id}
                      placeholder={copy.noStage}
                      noneLabel={copy.noStage}
                      disabled={update.isPending}
                      onChange={(pipelineStageId) => void patch({ pipelineStageId })}
                    />
                  </Row>
                  <Row label={copy.detail.owner}>
                    <OwnerPicker
                      aria-label={copy.detail.owner}
                      value={customer.owner?.memberId}
                      valueLabel={customer.owner?.name}
                      placeholder={copy.noOwner}
                      noneLabel={copy.noOwner}
                      disabled={update.isPending}
                      onChange={(ownerMemberId) => void patch({ ownerMemberId })}
                    />
                  </Row>
                </dl>
              </Section>

              <Section title={copy.detail.tags}>
                <TagEditor
                  tags={customer.tags}
                  disabled={setTags.isPending}
                  onChange={(tags) => void changeTags(tags)}
                />
              </Section>

              <Section title={copy.detail.contact}>
                <dl className='space-y-3'>
                  <Row label={copy.detail.phone}>
                    {customer.phoneNumber ?? (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </Row>
                  <Row label={copy.detail.email}>
                    {customer.email ? (
                      <span className='break-all'>{customer.email}</span>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </Row>
                  <Row label={copy.columns.lastInteraction}>
                    <RelativeTime
                      date={customer.lastInteractionAt}
                      empty={copy.noContact}
                    />
                  </Row>
                </dl>
              </Section>

              <Section title={copy.detail.conversations}>
                <p className='text-sm'>
                  {copy.conversationsCount(customer.conversationsCount)}
                </p>
                {open ? (
                  <Button asChild>
                    <Link to='/chats' search={{ conversation: open.id }}>
                      <MessageSquare aria-hidden />
                      {copy.detail.openConversation}
                    </Link>
                  </Button>
                ) : (
                  <p className='text-muted-foreground text-sm'>
                    {copy.detail.noOpenConversation}
                  </p>
                )}
              </Section>
            </>
          ) : isLoading ? (
            <div className='space-y-4' aria-hidden>
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-24 w-full' />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
