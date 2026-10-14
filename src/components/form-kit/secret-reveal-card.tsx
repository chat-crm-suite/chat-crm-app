import { Check, Copy, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type SecretRevealCardProps = {
  secret: string
  /** What the secret is for: "Contraseña de Ana". */
  title: string
  /** Who needs it and what to do next. */
  description: ReactNode
  /** Label of the closing button. */
  doneLabel?: string
  onDone: () => void
}

/** Groups the secret in fours so it can be read aloud or retyped. */
const grouped = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret

/**
 * One-time reveal of a generated credential. The server never shows it again,
 * so closing is blocked until it was copied or revealed at least once: the
 * person cannot dismiss it unseen by reflex.
 */
export function SecretRevealCard({
  secret,
  title,
  description,
  doneLabel = 'Listo, ya la guardé',
  onDone,
}: SecretRevealCardProps) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setSeen(true)
    } catch {
      // Clipboard can be blocked (insecure origin): reveal it so it can be copied by hand.
      setVisible(true)
      setSeen(true)
    }
  }

  return (
    <div className='space-y-5'>
      <div className='space-y-1'>
        <h3 className='text-base font-semibold'>{title}</h3>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>

      <div className='bg-muted/50 rounded-lg border p-4'>
        <div
          className='font-mono text-xl tracking-wider break-all select-all'
          aria-label={visible ? `Contraseña: ${secret}` : 'Contraseña oculta'}
        >
          {visible ? grouped(secret) : '•••• •••• •••• ••'}
        </div>
        <div className='mt-4 flex flex-wrap gap-2'>
          <Button type='button' size='sm' onClick={copy}>
            {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
            {copied ? 'Copiada' : 'Copiar'}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            aria-pressed={visible}
            onClick={() => {
              setVisible((v) => !v)
              setSeen(true)
            }}
          >
            {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
            {visible ? 'Ocultar' : 'Mostrar'}
          </Button>
          <span role='status' className='sr-only'>
            {copied ? 'Contraseña copiada al portapapeles' : ''}
          </span>
        </div>
      </div>

      <p className='text-muted-foreground flex items-start gap-2 text-[13px]'>
        <ShieldAlert aria-hidden className='mt-0.5 size-4 shrink-0' />
        Esta contraseña no se volverá a mostrar. Si se pierde, podrás generar
        una nueva desde el menú de la fila.
      </p>

      <Button
        type='button'
        className='w-full'
        disabled={!seen}
        onClick={onDone}
      >
        {doneLabel}
      </Button>
      {!seen ? (
        <p className='text-muted-foreground text-center text-xs'>
          Cópiala o muéstrala para poder cerrar.
        </p>
      ) : null}
    </div>
  )
}
