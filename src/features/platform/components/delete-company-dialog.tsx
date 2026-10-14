import { useId, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlatformCompanyRow } from '@chat-crm/contracts'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  deletePlatformCompany,
  isPlatformLocked,
} from '@/services/platform.service'
import { DELETE_COPY } from '../copy'

type Props = {
  company: PlatformCompanyRow | null
  onOpenChange: (open: boolean) => void
}

/**
 * Deleting a company cuts its members off, so the dialog states exactly how
 * many people are affected and asks for the company's name before enabling the
 * button. Typing the name is the speed bump; the effect is the explanation.
 */
export function DeleteCompanyDialog({ company, onOpenChange }: Props) {
  return (
    <AlertDialog open={company !== null} onOpenChange={onOpenChange}>
      {company ? (
        <DeleteContent
          key={company.id}
          company={company}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </AlertDialog>
  )
}

function DeleteContent({
  company,
  onClose,
}: {
  company: PlatformCompanyRow
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === company.name.trim()

  const remove = useMutation({
    mutationFn: () => deletePlatformCompany(company.id),
    onSuccess: ({ affectedMembers }) => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
      toast.success(DELETE_COPY.deleted(company.name, affectedMembers))
      onClose()
    },
    onError: (error) => {
      if (!isPlatformLocked(error)) toast.error(DELETE_COPY.failed)
    },
  })

  return (
    <AlertDialogContent>
      <AlertDialogHeader className='text-start'>
        <AlertDialogTitle>{DELETE_COPY.title(company.name)}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className='space-y-2'>
            <p className='text-foreground font-medium'>
              {DELETE_COPY.effect(company.membersCount)}
            </p>
            <p>{DELETE_COPY.details}</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <form
        className='space-y-2'
        onSubmit={(event) => {
          event.preventDefault()
          if (matches && !remove.isPending) remove.mutate()
        }}
      >
        <Label htmlFor={inputId} className='text-sm'>
          {DELETE_COPY.confirmLabel(company.name)}
        </Label>
        <Input
          id={inputId}
          autoComplete='off'
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <AlertDialogFooter className='pt-4'>
          <AlertDialogCancel type='button' disabled={remove.isPending}>
            {DELETE_COPY.cancel}
          </AlertDialogCancel>
          <LoadingButton
            type='submit'
            variant='destructive'
            loading={remove.isPending}
            disabled={!matches}
          >
            {DELETE_COPY.submit}
          </LoadingButton>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  )
}
