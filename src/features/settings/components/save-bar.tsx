import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'

type SaveBarProps = {
  /** Only rendered while the form has unsaved changes. */
  dirty: boolean
  saving?: boolean
  /** Id of the `<form>` this bar submits. */
  formId: string
  onDiscard: () => void
  saveLabel?: string
  message?: string
}

/**
 * Sticky footer that appears the moment a form has edits and leaves with
 * them. It is the one place to save or throw changes away, so a settings page
 * never shows a dead "Guardar" button while nothing changed.
 */
export function SaveBar({
  dirty,
  saving,
  formId,
  onDiscard,
  saveLabel = 'Guardar cambios',
  message = 'Tienes cambios sin guardar',
}: SaveBarProps) {
  if (!dirty) return null

  return (
    <div
      role='region'
      aria-label='Cambios sin guardar'
      className='bg-popover sticky bottom-4 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-200'
    >
      <p className='flex items-center gap-2 text-sm font-medium' role='status'>
        <span aria-hidden className='bg-primary size-2 rounded-full' />
        {message}
      </p>
      <div className='ms-auto flex gap-2'>
        <Button
          type='button'
          variant='ghost'
          onClick={onDiscard}
          disabled={saving}
        >
          Descartar
        </Button>
        <LoadingButton type='submit' form={formId} loading={saving}>
          {saveLabel}
        </LoadingButton>
      </div>
    </div>
  )
}
