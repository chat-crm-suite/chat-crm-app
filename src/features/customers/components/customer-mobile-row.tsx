import type { CustomerRow } from '@chat-crm/contracts'
import { IdentityCell } from '@/components/data-grid'
import { avatarName, customerName } from '../customers-data'
import {
  OpenConversationLink,
  OwnerLabel,
  StageLabel,
  TagList,
} from './customers-columns'

/** Stacked rendering of a customer below `md`: tap the card for the detail. */
export function CustomerMobileRow({
  customer,
  onOpen,
}: {
  customer: CustomerRow
  onOpen: () => void
}) {
  const name = customerName(customer)

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Abrir ${name}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return
        onOpen()
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className='focus-visible:bg-muted/40 space-y-2 px-4 py-3 focus-visible:outline-none'
    >
      <div className='flex items-start justify-between gap-3'>
        <IdentityCell
          tintKey={customer.id}
          name={avatarName(customer)}
          fallback={customer.phoneNumber}
          src={customer.avatarUrl}
          title={name}
          subtitle={name === customer.phoneNumber ? null : customer.phoneNumber}
        />
        <OpenConversationLink customer={customer} />
      </div>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 ps-12'>
        <StageLabel stage={customer.stage} />
        <OwnerLabel owner={customer.owner} />
      </div>
      {customer.tags.length > 0 ? (
        <div className='ps-12'>
          <TagList tags={customer.tags} />
        </div>
      ) : null}
    </div>
  )
}
