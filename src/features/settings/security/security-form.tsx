import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { ChangePasswordSchema } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { useAuthStore } from '@/stores/auth-store'
import { Field, FormSection } from '@/components/form-kit'
import { PasswordInput } from '@/components/input-password'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { changePassword, revokeAllSessions } from '@/services/profile.service'
import { SaveBar } from '../components/save-bar'
import { SECURITY_COPY } from '../copy'

type PasswordValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const FORM_ID = 'password-form'
const EMPTY: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function SecurityForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const form = useForm<PasswordValues>({
    defaultValues: EMPTY,
    resolver: contractResolver<PasswordValues>(ChangePasswordSchema, {
      toPayload: ({ currentPassword, newPassword }) => ({
        currentPassword,
        newPassword,
      }),
      // UI-only rules composed on top of the contract.
      extraErrors: ({ currentPassword, newPassword, confirmPassword }) => ({
        newPassword:
          newPassword && newPassword === currentPassword
            ? SECURITY_COPY.sameAsCurrent
            : undefined,
        confirmPassword:
          confirmPassword !== newPassword ? SECURITY_COPY.mismatch : undefined,
      }),
    }),
  })
  const { register, handleSubmit, reset, setError, formState } = form
  const { errors, isDirty } = formState

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      reset(EMPTY)
      toast.success(SECURITY_COPY.changed)
    },
    onError: (error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 400 || status === 401 || status === 403) {
        setError('currentPassword', { message: SECURITY_COPY.wrongCurrent })
        return
      }
      toast.error(SECURITY_COPY.changeFailed)
    },
  })

  const revoke = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: () => {
      setConfirmRevoke(false)
      useAuthStore.getState().auth.reset()
      queryClient.clear()
      void navigate({ to: '/sign-in', replace: true } as never)
    },
    onError: () => {
      setConfirmRevoke(false)
      toast.error(SECURITY_COPY.revokeFailed)
    },
  })

  return (
    <div className='space-y-12'>
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit((values) => change.mutate(values))}
      >
        <FormSection
          title={SECURITY_COPY.passwordSection}
          description={SECURITY_COPY.passwordSectionHint}
        >
          <Field
            label={SECURITY_COPY.current}
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              autoComplete='current-password'
              {...register('currentPassword')}
            />
          </Field>
          <Field
            label={SECURITY_COPY.next}
            hint={SECURITY_COPY.nextHint}
            error={errors.newPassword?.message}
          >
            <PasswordInput
              autoComplete='new-password'
              {...register('newPassword')}
            />
          </Field>
          <Field
            label={SECURITY_COPY.confirm}
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              autoComplete='new-password'
              {...register('confirmPassword')}
            />
          </Field>
        </FormSection>
      </form>

      <FormSection
        title={SECURITY_COPY.sessionsSection}
        description={SECURITY_COPY.sessionsHint}
      >
        <div>
          <Button
            type='button'
            variant='outline'
            className='text-destructive border-destructive/40 hover:text-destructive'
            onClick={() => setConfirmRevoke(true)}
          >
            <LogOut className='size-4' />
            {SECURITY_COPY.revokeAll}
          </Button>
        </div>
      </FormSection>

      <SaveBar
        dirty={isDirty}
        saving={change.isPending}
        formId={FORM_ID}
        saveLabel={SECURITY_COPY.submit}
        message='Vas a cambiar tu contraseña'
        onDiscard={() => reset(EMPTY)}
      />

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{SECURITY_COPY.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {SECURITY_COPY.revokeDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending}
              onClick={(event) => {
                event.preventDefault()
                revoke.mutate()
              }}
            >
              {SECURITY_COPY.revokeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
