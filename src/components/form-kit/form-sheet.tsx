import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
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
import { Kbd } from '@/components/ui/kbd'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type FormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Called on submit (Enter in a field, the primary button, or Ctrl/⌘+Enter). */
  onSubmit: () => void | Promise<void>
  submitLabel: string
  submitting?: boolean
  /** Unsaved edits: closing asks before discarding them. */
  isDirty?: boolean
  /** Replaces the whole form (e.g. a result step after creating). */
  result?: ReactNode
  /** Sheet title while `result` is shown ("Miembro agregado"). */
  resultTitle?: string
  children: ReactNode
}

/**
 * Right-hand sheet for creating or editing one record. The body scrolls, the
 * footer stays put so the primary action is always reachable, and a dirty form
 * never closes by accident (Esc, overlay click, Cancel).
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel,
  submitting,
  isDirty,
  result,
  resultTitle,
  children,
}: FormSheetProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true)
    if (isDirty && !result && !submitting) return setConfirmDiscard(true)
    onOpenChange(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!submitting) void onSubmit()
  }

  const submitWithShortcut = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      if (!submitting) void onSubmit()
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-[30rem]'>
          <SheetHeader className='border-b px-6 py-5 text-start'>
            <SheetTitle className='text-lg'>
              {result && resultTitle ? resultTitle : title}
            </SheetTitle>
            {description && !result ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>

          {result ? (
            <div className='flex-1 overflow-y-auto px-6 py-6'>{result}</div>
          ) : (
            <form
              noValidate
              onSubmit={submit}
              onKeyDown={submitWithShortcut}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 space-y-8 overflow-y-auto px-6 py-6'>
                {children}
              </div>
              <footer className='bg-background flex items-center justify-between gap-3 border-t px-6 py-4'>
                <span className='text-muted-foreground hidden items-center gap-1 text-xs sm:inline-flex'>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Enter</Kbd> para guardar
                </span>
                <div className='ms-auto flex gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => requestClose(false)}
                  >
                    Cancelar
                  </Button>
                  <LoadingButton type='submit' loading={submitting}>
                    {submitLabel}
                  </LoadingButton>
                </div>
              </footer>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Lo que escribiste no se ha guardado y se perderá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false)
                onOpenChange(false)
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
