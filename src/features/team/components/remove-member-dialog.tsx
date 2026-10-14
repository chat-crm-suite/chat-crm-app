import { useEffect, useState } from 'react'
import type { TeamMemberRow } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '../copy'
import {
  memberName,
  teamErrorMessage,
  useRemoveMember,
} from '../team-mutations'

type Props = {
  member: TeamMemberRow | null
  onClose: () => void
}

/**
 * Deleting a member is not undoable from the table, so the person has to type
 * the username, and the dialog says what happens to the open conversations.
 */
export function RemoveMemberDialog({ member, onClose }: Props) {
  const remove = useRemoveMember()
  const [typed, setTyped] = useState('')

  useEffect(() => setTyped(''), [member?.id])

  if (!member) return null
  const name = memberName(member)
  const matches = typed.trim().toLowerCase() === member.username.toLowerCase()

  const confirm = async () => {
    try {
      const { releasedConversations } = await remove.mutateAsync(member.id)
      toast.success(copy.remove.done(name, releasedConversations))
      onClose()
    } catch (error) {
      toast.error(teamErrorMessage(error))
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={copy.remove.title(name)}
      desc={
        <div className='space-y-2'>
          <p>{copy.remove.openConversations(member.openConversations)}</p>
          <p>{copy.remove.consequences}</p>
        </div>
      }
      destructive
      confirmText={copy.remove.confirm}
      cancelBtnText={copy.remove.cancel}
      disabled={!matches}
      isLoading={remove.isPending}
      handleConfirm={confirm}
    >
      <div className='space-y-1.5'>
        <Label htmlFor='remove-member-confirm' className='text-sm'>
          {copy.remove.typeToConfirm(member.username)}
        </Label>
        <Input
          id='remove-member-confirm'
          autoComplete='off'
          autoCapitalize='none'
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  )
}
