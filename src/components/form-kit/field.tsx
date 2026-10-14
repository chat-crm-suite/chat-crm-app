import { AlertCircle } from 'lucide-react'
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FieldProps = {
  label: string
  /** Appends "(opcional)" instead of marking every required field with *. */
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  /** A single input-like element; it receives id, aria-invalid and aria-describedby. */
  children: ReactElement<{
    id?: string
    'aria-invalid'?: boolean
    'aria-describedby'?: string
  }>
}

/**
 * Label above, control, then hint or error below. The error replaces the hint
 * (one message at a time), is announced, and is wired to the control with
 * aria-describedby. Works with plain inputs and with react-hook-form's
 * `Controller`/`register` alike.
 */
export function Field({
  label,
  optional,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const hasMessage = Boolean(error || hint)

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        'aria-invalid': error ? true : children.props['aria-invalid'],
        'aria-describedby': hasMessage ? messageId : undefined,
      })
    : children

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={children.props.id ?? id} className='text-sm font-medium'>
        {label}
        {optional ? (
          <span className="text-muted-foreground font-normal">(opcional)</span>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p
          id={messageId}
          role='alert'
          className='text-destructive flex items-start gap-1.5 text-[13px]'
        >
          <AlertCircle aria-hidden className='mt-0.5 size-3.5 shrink-0' />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className='text-muted-foreground text-[13px]'>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
