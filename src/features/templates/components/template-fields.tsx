import { useCallback, useMemo, useState } from 'react'
import {
  templateParamKey,
  type Template,
  type TemplateVariable,
} from '@chat-crm/contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COMPONENT_LABEL, copy } from '../copy'

export type TemplateParams = Record<string, string>

/** Variables of a template that still have no value. */
export function missingVariables(
  variables: readonly TemplateVariable[],
  params: Readonly<TemplateParams>
): TemplateVariable[] {
  return variables.filter(
    (variable) => !params[templateParamKey(variable)]?.trim()
  )
}

/**
 * `params` of `SendTemplateInput` for the chosen template: one value per
 * variable keyed by `templateParamKey`, trimmed, with no stray keys from a
 * previously chosen template.
 */
export function templateParams(
  template: Pick<Template, 'variables'>,
  params: Readonly<TemplateParams>
): TemplateParams {
  return Object.fromEntries(
    template.variables.map((variable) => {
      const key = templateParamKey(variable)
      return [key, (params[key] ?? '').trim()]
    })
  )
}

/** Values typed for the chosen template; switching template starts clean. */
export function useTemplateParams(template: Template | null) {
  const [state, setState] = useState<{
    id: string | null
    params: TemplateParams
  }>({ id: null, params: {} })
  const params = useMemo(
    () => (state.id === template?.id ? state.params : {}),
    [state, template?.id]
  )

  const setParam = useCallback(
    (key: string, value: string) =>
      setState((previous) => ({
        id: template?.id ?? null,
        params: {
          ...(previous.id === template?.id ? previous.params : {}),
          [key]: value,
        },
      })),
    [template?.id]
  )

  const missing = template ? missingVariables(template.variables, params) : []

  return {
    params,
    setParam,
    missing,
    reset: () => setState({ id: null, params: {} }),
  }
}

/** Human label of a variable: the admin's label, else `Variable {{1}}`. */
export function variableLabel(variable: TemplateVariable) {
  const base = variable.label ?? copy.variable(variable.key)
  return variable.component === 'body'
    ? base
    : `${base} · ${COMPONENT_LABEL[variable.component]}`
}

/** One input per variable, in template order; the example is the hint. */
export function TemplateFields({
  template,
  params,
  onChange,
  idPrefix,
}: {
  template: Template
  params: Readonly<TemplateParams>
  onChange: (key: string, value: string) => void
  idPrefix: string
}) {
  if (template.variables.length === 0) return null

  return (
    <div className='space-y-3'>
      {template.variables.map((variable) => {
        const key = templateParamKey(variable)
        const id = `${idPrefix}-${key.replace(/[^\w-]/g, '_')}`
        return (
          <div key={key} className='space-y-1.5'>
            <Label htmlFor={id} className='text-xs font-medium'>
              {variableLabel(variable)}
            </Label>
            <Input
              id={id}
              value={params[key] ?? ''}
              maxLength={1024}
              placeholder={variable.example ?? ''}
              onChange={(event) => onChange(key, event.target.value)}
              className='h-11 sm:h-9'
            />
          </div>
        )
      })}
    </div>
  )
}
