import type { ReactNode } from 'react'
import type { CreateMemberResult } from '@chat-crm/contracts'
import { CircleCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SecretRevealCard } from '@/components/form-kit'
import { ROLE_LABEL, copy } from '../copy'

function Outcome({
  icon,
  title,
  children,
  onDone,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  onDone: () => void
}) {
  return (
    <div className='space-y-5'>
      <div className='flex items-start gap-3'>
        <span className='bg-primary/20 text-foreground mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full'>
          {icon}
        </span>
        <div className='space-y-1'>
          <h3 className='text-base font-semibold'>{title}</h3>
          <p className='text-muted-foreground text-sm'>{children}</p>
        </div>
      </div>
      <Button className='w-full' onClick={onDone}>
        {copy.result.done}
      </Button>
    </div>
  )
}

/**
 * Last step of "Agregar miembro": what the server did decides what to show.
 * The password exists only on `created` and is revealed once.
 */
export function MemberResult({
  result,
  name,
  onDone,
}: {
  result: CreateMemberResult
  name: string
  onDone: () => void
}) {
  const role = ROLE_LABEL[result.member.role]

  if (result.outcome === 'created' && result.initialPassword) {
    return (
      <SecretRevealCard
        secret={result.initialPassword}
        title={copy.result.createdSecretTitle(name)}
        description={copy.result.createdSecretHint(name)}
        onDone={onDone}
      />
    )
  }

  if (result.outcome === 'restored') {
    return (
      <Outcome
        icon={<UserCheck aria-hidden className='size-4' />}
        title={copy.result.restoredTitle}
        onDone={onDone}
      >
        {copy.result.restoredBody(name, role)}
      </Outcome>
    )
  }

  return (
    <Outcome
      icon={<CircleCheck aria-hidden className='size-4' />}
      title={copy.result.linkedTitle}
      onDone={onDone}
    >
      {copy.result.linkedBody(name, role)}
    </Outcome>
  )
}
