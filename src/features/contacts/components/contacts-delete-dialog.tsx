import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { deleteContact } from '@/services/contact.service'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { ContactResponse as Contact } from '@chat-crm/contracts'

type ContactsDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Contact
}

export function ContactsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: ContactsDeleteDialogProps) {
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()

  const handleDelete = () => {
    if (value.trim() !== currentRow.username) return

    toast.promise(deleteContact(currentRow.id), {
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ['contacts'],
        })
        return 'Contacto borrado exitosamente'
      },
      error: (err) => {
        console.error(err)
        if (err.response?.data?.message) {
          return err.response.data.message
        }
        return 'Error al borrar el contacto.'
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='stroke-destructive me-1 inline-block'
            size={18}
          />{' '}
          Delete Contact
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete{' '}
            <span className='font-bold'> {currentRow.username} </span>?
            <br />
            This action will permanently remove the contact with phone{' '}
            <span className='font-bold'> {currentRow.phoneNumber} </span> from
            the system.This cannot be undone.
          </p>

          <Label className='my-2'>
            Phone:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter phone to confirm deletion.'
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning! </AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
