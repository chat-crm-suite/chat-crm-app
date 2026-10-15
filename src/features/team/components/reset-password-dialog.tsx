import { useEffect, useState } from 'react'
import type { TeamMemberRow } from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingButton } from '@/components/ui/loading-button'
import { SecretRevealCard } from '@/components/form-kit'
import { copy } from '../copy'
import {
  memberName,
  teamErrorMessage,
  useResetPassword,
} from '../team-mutations'

type Props = {
  member: TeamMemberRow | null
  onClose: () => void
}

/**
 * Two steps in one dialog: confirm (it kills the member's sessions), then the
 * new password, shown once. The result step cannot be dismissed by Escape or a
 * stray click: only after the password was copied or revealed.
 */
export function ResetPasswordDialog({ member, onClose }: Props) {
  const reset = useResetPassword()
  const [password, setPassword] = useState<string | null>(null)

  useEffect(() => setPassword(null), [member?.id])

  if (!member) return null
  const name = memberName(member)

  const confirm = async () => {
    try {
      const result = await reset.mutateAsync(member.id)
      setPassword(result.password)
    } catch (error) {
      toast.error(teamErrorMessage(error))
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !password) onClose()
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => password && event.preventDefault()}
      >
        {password ? (
          <>
            <AlertDialogHeader className='sr-only'>
              <AlertDialogTitle>{copy.reset.resultTitle(name)}</AlertDialogTitle>
              <AlertDialogDescription>
                {copy.reset.resultHint(name)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <SecretRevealCard
              secret={password}
              title={copy.reset.resultTitle(name)}
              description={copy.reset.resultHint(name)}
              onDone={onClose}
            />
          </>
        ) : (
          <>
            <AlertDialogHeader className='text-start'>
              <AlertDialogTitle>{copy.reset.title(name)}</AlertDialogTitle>
              <AlertDialogDescription>
                {copy.reset.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reset.isPending}>
                {copy.reset.cancel}
              </AlertDialogCancel>
              <LoadingButton loading={reset.isPending} onClick={confirm}>
                {copy.reset.confirm}
              </LoadingButton>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
