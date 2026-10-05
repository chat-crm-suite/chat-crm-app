import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CopyIconButtonProps {
  text: string
}

export const CopyIconButton = ({ text }: CopyIconButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!(await copyToClipboard(text))) {
      toast.error('No se pudo copiar: selecciona el texto y cópialo a mano')
      return
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button
      variant='ghost'
      type='button'
      size='icon'
      className='relative disabled:opacity-100'
      onClick={handleCopy}
      disabled={copied}
    >
      <span
        className={cn(
          'transition-all',
          copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        )}
      >
        <CheckIcon />
      </span>
      <span
        className={cn(
          'absolute transition-all',
          copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        <CopyIcon />
      </span>
    </Button>
  )
}
