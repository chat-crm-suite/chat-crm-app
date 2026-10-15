import { useId, type ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'

type SwitchRowProps = {
  label: string
  description: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/**
 * A yes/no setting: what it is called, what turning it on does, and the
 * switch. Rows are stacked inside {@link SwitchList}.
 */
export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SwitchRowProps) {
  const id = useId()

  return (
    <li className='flex items-start justify-between gap-6 px-4 py-4'>
      <div className='min-w-0 space-y-0.5'>
        <p id={`${id}-label`} className='text-sm font-medium'>
          {label}
        </p>
        <p id={`${id}-hint`} className='text-muted-foreground text-[13px] text-pretty'>
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className='mt-0.5'
      />
    </li>
  )
}

export function SwitchList({ children }: { children: ReactNode }) {
  return <ul className='divide-y rounded-xl border'>{children}</ul>
}
