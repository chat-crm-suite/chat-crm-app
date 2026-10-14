import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copy } from '../copy'
import { useImportCustomers } from '../customers-data'

/** "Importar CSV": picks a file and reports what the import did. */
export function ImportButton() {
  const input = useRef<HTMLInputElement>(null)
  const { mutateAsync, isPending } = useImportCustomers()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const result = await mutateAsync(file)
      toast.success(
        copy.importResult(result.created, result.restored, result.skipped)
      )
    } catch {
      toast.error(copy.importFailed)
    } finally {
      // Lets the same file be picked again after fixing it.
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={input}
        type='file'
        accept='.csv,text/csv'
        className='sr-only'
        tabIndex={-1}
        aria-label='Archivo CSV de clientes'
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <Button
        type='button'
        variant='outline'
        disabled={isPending}
        onClick={() => input.current?.click()}
      >
        {isPending ? (
          <Loader2 aria-hidden className='size-4 motion-safe:animate-spin' />
        ) : (
          <Upload aria-hidden className='size-4' />
        )}
        {isPending ? copy.importing : copy.import}
      </Button>
    </>
  )
}
