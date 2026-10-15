import type { PipelineStage } from '@chat-crm/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ColorDot } from './customers-columns'

/** Radix Select cannot hold an empty value: this stands for "none". */
const NONE = '__none__'

type Props = {
  id?: string
  value?: string | null
  stages: PipelineStage[]
  placeholder: string
  /** `null` means "Sin etapa" (only when `noneLabel` is given). */
  onChange: (stageId: string | null) => void
  /** Offers a first option that clears the stage. */
  noneLabel?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Pipeline stage as a select with its colour mark. */
export function StageSelect({
  id,
  value,
  stages,
  placeholder,
  onChange,
  noneLabel,
  disabled,
  ...aria
}: Props) {
  return (
    <Select
      value={value ?? (noneLabel ? NONE : undefined)}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className='w-full' {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel ? (
          <SelectItem value={NONE}>
            <ColorDot />
            {noneLabel}
          </SelectItem>
        ) : null}
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            <ColorDot color={stage.color} />
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
