import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import {
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRightCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import type { ContactResponse as Contact, ContactStatus } from '@chat-crm/contracts'
import { ContactsMultiDeleteDialog } from './contacts-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: ContactStatus) => {
    const selectedContacts = selectedRows.map((row) => row.original as Contact)
    toast.promise(sleep(1500), {
      loading: `Updating contacts status...`,
      success: () => {
        table.resetRowSelection()
        return `Updated ${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} to ${status}`
      },
      error: 'Error updating contacts status',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='contact'>
        {/* Marcar como "Nuevo" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('new')}
              className='size-8'
              aria-label='Mark as new'
              title='Mark as new'
            >
              <Clock />
              <span className='sr-only'>Mark as new</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as new</p>
          </TooltipContent>
        </Tooltip>

        {/* Marcar como "En seguimiento" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label='Mark as in progress'
              title='Mark as in progress'
            >
              <ArrowRightCircle />
              <span className='sr-only'>Mark as in progress</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as in progress</p>
          </TooltipContent>
        </Tooltip>

        {/* Marcar como "Cliente ganado" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label='Mark as active client'
              title='Mark as active client'
            >
              <CheckCircle2 />
              <span className='sr-only'>Mark as active client</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as active client</p>
          </TooltipContent>
        </Tooltip>

        {/* Marcar como "Perdido" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('blocked')}
              className='size-8'
              aria-label='Mark as lost'
              title='Mark as lost'
            >
              <XCircle />
              <span className='sr-only'>Mark as lost</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as lost</p>
          </TooltipContent>
        </Tooltip>

        {/* Eliminar contactos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Delete selected contacts'
              title='Delete selected contacts'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected contacts</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected contacts</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <ContactsMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
