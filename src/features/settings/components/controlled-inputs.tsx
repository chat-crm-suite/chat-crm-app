import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { PhoneInput } from '@/components/ui/phone-input'
import { TimezoneSelect } from './timezone-select'

/** What `Field` injects into its single child (id + a11y wiring). */
type Injected = {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

type ControlledProps<T extends FieldValues> = Injected & {
  control: Control<T>
  name: Path<T>
  disabled?: boolean
}

/**
 * `Field` clones its child to wire the label and the error message. A bare
 * `Controller` would swallow those props, so these wrappers take them and hand
 * them to the real input.
 */
export function ControlledPhone<T extends FieldValues>({
  control,
  name,
  disabled,
  ...aria
}: ControlledProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <PhoneInput
          international
          defaultCountry='PE'
          disabled={disabled}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          {...aria}
        />
      )}
    />
  )
}

export function ControlledTimezone<T extends FieldValues>({
  control,
  name,
  disabled,
  ...aria
}: ControlledProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TimezoneSelect
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
          {...aria}
        />
      )}
    />
  )
}
