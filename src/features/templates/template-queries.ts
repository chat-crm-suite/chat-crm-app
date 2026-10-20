import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listTemplateGroups,
  listTemplates,
  syncTemplates,
  updateTemplateSettings,
} from '@/services/template.service'
import type {
  Template,
  TemplateListQuery,
  UpdateTemplateSettingsInput,
} from '@chat-crm/contracts'

export const templateKeys = {
  all: ['templates'] as const,
  list: (query: Partial<TemplateListQuery>) =>
    ['templates', 'list', query] as const,
  groups: ['templates', 'groups'] as const,
}

/** Approved templates of one channel (what can be sent on it). */
export function useApprovedTemplates(
  channelId: string | null | undefined,
  enabled = true
) {
  const query = {
    channelId: channelId ?? undefined,
    status: 'approved' as const,
  }
  return useQuery({
    queryKey: templateKeys.list(query),
    queryFn: () => listTemplates(query),
    enabled: enabled && !!channelId,
    staleTime: 60_000,
  })
}

/** Every template the caller may see (detail sheet of Plantillas). */
export function useAllTemplates(enabled = true) {
  return useQuery({
    queryKey: templateKeys.list({}),
    queryFn: () => listTemplates({}),
    enabled,
    staleTime: 30_000,
  })
}

export function useTemplateGroups() {
  return useQuery({
    queryKey: templateKeys.groups,
    queryFn: listTemplateGroups,
    staleTime: 30_000,
  })
}

export function useSyncTemplates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => syncTemplates(channelId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  })
}

export function useUpdateTemplateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateTemplateSettingsInput
    }) => updateTemplateSettings(id, input),
    onSuccess: (template: Template) => {
      queryClient.setQueriesData<Template[]>(
        { queryKey: ['templates', 'list'] },
        (old) => old?.map((item) => (item.id === template.id ? template : item))
      )
      void queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}
