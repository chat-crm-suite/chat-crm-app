import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from './ui/button'

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  ref?: React.Ref<HTMLInputElement>
}

export function PasswordInput({
  className,
  disabled,
  ref,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className={cn('relative rounded-md', className)}>
      <Input
        type={showPassword ? 'text' : 'password'}
        ref={ref}
        disabled={disabled}
        {...props}
      />
      <Button
        type='button'
        size='icon'
        variant='ghost'
        disabled={disabled}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={showPassword}
        className='text-muted-foreground bg-input absolute end-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md'
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <Eye aria-hidden size={18} />
        ) : (
          <EyeOff aria-hidden size={18} />
        )}
      </Button>
    </div>
  )
}
