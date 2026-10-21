import {
  SyncTemplatesResultSchema,
  TemplateGroupSchema,
  TemplateHeaderUploadResultSchema,
  TemplateSchema,
  type SyncTemplatesResult,
  type Template,
  type TemplateHeaderUploadResult,
  type TemplateGroup,
  type TemplateListQuery,
  type UpdateTemplateSettingsInput,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { withDevFixture } from '@/lib/dev-fixtures'
import { client } from '@/lib/http'

const templates = client('/templates')

const fixtures = () => import('@/features/templates/__fixtures__/templates')

/**
 * `GET /templates`. Admin/supervisor get every template; agents only the
 * approved ones visible to them, whatever they ask for.
 */
export const listTemplates = (
  query: Partial<TemplateListQuery> = {}
): Promise<Template[]> =>
  withDevFixture(
    async () =>
      (await fixtures()).FIXTURE_TEMPLATES.filter(
        (template) =>
          (!query.channelId || template.channelId === query.channelId) &&
          (!query.status || template.status === query.status)
      ),
    async () => {
      const { data } = await templates.get('', { params: query })
      return parseContract(TemplateSchema.array(), data ?? [])
    }
  )

/** `GET /templates/groups`: one row per name across channels. */
export const listTemplateGroups = (): Promise<TemplateGroup[]> =>
  withDevFixture(
    async () => (await fixtures()).FIXTURE_TEMPLATE_GROUPS,
    async () => {
      const { data } = await templates.get('/groups')
      return parseContract(TemplateGroupSchema.array(), data ?? [])
    }
  )

/** `POST /templates/sync` (admin): pull the channel's templates now. */
export const syncTemplates = async (
  channelId: string
): Promise<SyncTemplatesResult> => {
  const { data } = await templates.post('/sync', { channelId })
  return parseContract(SyncTemplatesResultSchema, data)
}

/**
 * `POST /templates/:id/header-upload`: stages the header file of a template
 * (its `headerMedia` kind, the channel's upload rules). The `uploadId` goes
 * in `SendTemplateInput.headerMedia`, in a chat or when starting one.
 */
export const uploadTemplateHeader = async (
  templateId: string,
  file: File,
  {
    onProgress,
    signal,
  }: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {}
): Promise<TemplateHeaderUploadResult> => {
  const form = new FormData()
  form.append('file', file, file.name)
  const { data } = await templates.post<unknown>(
    `/${templateId}/header-upload`,
    form,
    {
      signal,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(event.loaded / event.total)
      },
    }
  )
  return parseContract(TemplateHeaderUploadResultSchema, data)
}

/** `PATCH /templates/:id/settings` (admin): CRM-side settings only. */
export const updateTemplateSettings = async (
  id: string,
  input: UpdateTemplateSettingsInput
): Promise<Template> => {
  const { data } = await templates.patch(`/${id}/settings`, input)
  return parseContract(TemplateSchema, data)
}
