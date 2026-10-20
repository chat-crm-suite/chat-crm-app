import { useEffect, useMemo, useState } from 'react'
import {
  templateParamKey,
  type Template,
  type UpdateTemplateSettingsInput,
} from '@chat-crm/contracts'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ChannelChip } from '@/features/chats/components/channel-icon'
import {
  COMPONENT_LABEL,
  META_TEMPLATES_URL,
  TEMPLATE_CATEGORY_LABEL,
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_TINT,
  copy,
} from '../copy'
import { useAllTemplates, useUpdateTemplateSettings } from '../template-queries'
import { TemplatePreview } from './template-preview'

/** Provider examples fill the preview, so the sheet shows a real message. */
const exampleParams = (template: Template) =>
  Object.fromEntries(
    template.variables.map((variable) => [
      templateParamKey(variable),
      variable.example ?? '',
    ])
  )

function SettingsForm({ template }: { template: Template }) {
  const update = useUpdateTemplateSettings()
  const initialLabels = useMemo(
    () =>
      Object.fromEntries(
        template.variables.map((variable) => [
          templateParamKey(variable),
          variable.label ?? '',
        ])
      ),
    [template]
  )
  const [visible, setVisible] = useState(template.visibleToAgents)
  const [labels, setLabels] = useState<Record<string, string>>(initialLabels)

  useEffect(() => {
    setVisible(template.visibleToAgents)
    setLabels(initialLabels)
  }, [template, initialLabels])

  const changedLabels = Object.fromEntries(
    Object.entries(labels).filter(
      ([key, value]) => value.trim() !== initialLabels[key]
    )
  )
  const dirty =
    visible !== template.visibleToAgents ||
    Object.keys(changedLabels).length > 0

  const save = () => {
    const input: UpdateTemplateSettingsInput = {
      ...(visible !== template.visibleToAgents
        ? { visibleToAgents: visible }
        : {}),
      ...(Object.keys(changedLabels).length
        ? {
            variableLabels: Object.fromEntries(
              Object.entries(changedLabels).map(([key, value]) => [
                key,
                value.trim(),
              ])
            ),
          }
        : {}),
    }
    update.mutate(
      { id: template.id, input },
      {
        onSuccess: () => toast.success(copy.detailSaved),
        onError: (error) =>
          toast.error(getApiErrorMessage(error, copy.detailSaveError)),
      }
    )
  }

  return (
    <section className='space-y-4'>
      <h3 className='text-sm font-semibold'>{copy.detailSettings}</h3>
      <div className='flex items-start justify-between gap-4 rounded-lg border p-3'>
        <div className='space-y-0.5'>
          <Label htmlFor='template-visible'>{copy.detailVisibleLabel}</Label>
          <p className='text-muted-foreground text-xs'>
            {copy.detailVisibleHint}
          </p>
        </div>
        <Switch
          id='template-visible'
          checked={visible}
          onCheckedChange={setVisible}
        />
      </div>
      {template.variables.map((variable) => {
        const key = templateParamKey(variable)
        const id = `label-${key.replace(/[^\w-]/g, '_')}`
        return (
          <div key={key} className='space-y-1.5'>
            <Label htmlFor={id} className='text-xs'>
              {copy.detailLabelFor(variable.key)} ·{' '}
              {COMPONENT_LABEL[variable.component]}
            </Label>
            <Input
              id={id}
              value={labels[key] ?? ''}
              maxLength={60}
              placeholder={variable.example ?? ''}
              onChange={(event) =>
                setLabels((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              className='h-11 sm:h-9'
            />
          </div>
        )
      })}
      <Button
        type='button'
        className='h-11 sm:h-9'
        disabled={!dirty || update.isPending}
        onClick={save}
      >
        {copy.detailSave}
      </Button>
    </section>
  )
}

/**
 * Detail of one template: preview filled with the provider's examples, its
 * variables and, for admins, the CRM-side settings (visibility to agents and
 * variable labels) plus the status check of a pending template. The content
 * itself is edited in Meta Business Manager.
 */
export function TemplateDetailSheet({
  templateId,
  onOpenChange,
  isAdmin,
  onCheckStatus,
  checking,
}: {
  templateId: string | null
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  onCheckStatus: (template: Template) => void
  checking?: boolean
}) {
  const templates = useAllTemplates(!!templateId)
  const template =
    templates.data?.find((item) => item.id === templateId) ?? null

  return (
    <Sheet open={!!templateId} onOpenChange={onOpenChange}>
      <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-lg'>
        <SheetHeader className='border-b px-6 py-5 text-start'>
          <SheetTitle className='truncate font-mono text-base'>
            {template?.name ?? copy.title}
          </SheetTitle>
          <SheetDescription asChild>
            <div className='flex flex-wrap items-center gap-1.5'>
              {template && (
                <>
                  <ChannelChip
                    type={template.channelType}
                    name={template.channelName}
                  />
                  <Badge
                    variant='secondary'
                    className={cn(
                      'h-5 text-[11px]',
                      TEMPLATE_STATUS_TINT[template.status]
                    )}
                  >
                    {TEMPLATE_STATUS_LABEL[template.status]}
                  </Badge>
                  <span className='text-xs'>
                    {TEMPLATE_CATEGORY_LABEL[template.category]} ·{' '}
                    {template.language}
                  </span>
                </>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-6 overflow-y-auto px-6 py-6'>
          {templates.isPending ? (
            <Skeleton className='h-40 w-full' />
          ) : !template ? (
            <p className='text-muted-foreground text-sm'>{copy.loadError}</p>
          ) : (
            <>
              {template.statusReason && (
                <p className='bg-destructive/10 rounded-lg px-3 py-2 text-xs'>
                  <span className='font-medium'>{copy.detailReason}:</span>{' '}
                  {template.statusReason}
                </p>
              )}
              {isAdmin && template.status === 'pending' && (
                <Button
                  type='button'
                  variant='outline'
                  className='h-11 w-full sm:h-9'
                  disabled={checking}
                  onClick={() => onCheckStatus(template)}
                >
                  <RefreshCw
                    className={cn('size-4', checking && 'animate-spin')}
                  />
                  {copy.checkStatus}
                </Button>
              )}

              <section className='space-y-2'>
                <h3 className='text-sm font-semibold'>{copy.detailPreview}</h3>
                <TemplatePreview
                  components={template.components}
                  params={exampleParams(template)}
                />
              </section>

              <section className='space-y-2'>
                <h3 className='text-sm font-semibold'>
                  {copy.detailVariables}
                </h3>
                {template.variables.length === 0 ? (
                  <p className='text-muted-foreground text-sm'>
                    {copy.detailNoVariables}
                  </p>
                ) : (
                  <dl className='divide-y rounded-lg border text-sm'>
                    {template.variables.map((variable) => (
                      <div
                        key={templateParamKey(variable)}
                        className='grid grid-cols-[5rem_minmax(0,1fr)] gap-2 px-3 py-2'
                      >
                        <dt className='font-mono text-xs'>
                          {`{{${variable.key}}}`}
                          <span className='text-muted-foreground block font-sans'>
                            {COMPONENT_LABEL[variable.component]}
                          </span>
                        </dt>
                        <dd className='min-w-0'>
                          <p className='truncate'>{variable.label ?? '—'}</p>
                          {variable.example && (
                            <p className='text-muted-foreground truncate text-xs'>
                              {copy.detailExample}: {variable.example}
                            </p>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              {isAdmin ? (
                <SettingsForm template={template} />
              ) : (
                <p className='text-muted-foreground text-xs'>{copy.readOnly}</p>
              )}

              {template.channelType === 'whatsapp' && (
                <a
                  href={META_TEMPLATES_URL}
                  target='_blank'
                  rel='noreferrer'
                  className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline'
                >
                  <ExternalLink className='size-3.5' aria-hidden />
                  {copy.detailEditInMeta}
                </a>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
