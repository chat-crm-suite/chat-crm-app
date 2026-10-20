import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type {
  CreateMemberInput,
  TeamMemberRow,
  TeamTableResponse,
  UpdateMemberInput,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  createMember,
  removeMember,
  resetMemberPassword,
  updateMember,
} from '@/services/team.service'
import { getApiError } from '../workspace/api-error-code'
import { teamKeys } from '../workspace/query-keys'
import { API_ERROR_COPY, copy } from './copy'
import { SCREEN_HANDLES_ERRORS } from '@/lib/handle-server-error'

/** What to tell the person when a team request fails. */
export const teamErrorMessage = (error: unknown) => {
  const { code } = getApiError(error)
  return (code && API_ERROR_COPY[code]) || copy.genericError
}

/** "Ana Pérez", or the username when the account has no names. */
export function memberName(
  member: Pick<TeamMemberRow, 'firstName' | 'lastName' | 'username'>
) {
  const full = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return full || member.username
}

type Snapshot = [readonly unknown[], TeamTableResponse | undefined][]

/** Rewrites one member in every cached Equipo page. */
function patchMember(
  queryClient: QueryClient,
  id: string,
  patch: (member: TeamMemberRow) => TeamMemberRow
) {
  queryClient.setQueriesData<TeamTableResponse>(
    { queryKey: teamKeys.tables },
    (data) =>
      data && {
        ...data,
        items: data.items.map((member) =>
          member.id === id ? patch(member) : member
        ),
      }
  )
}

/**
 * Inline auto-assign switch: the cached rows change at once and roll back with
 * a toast if the server refuses. The server's `team:changed` ping reconciles
 * any other tab.
 */
export function useToggleAutoAssign() {
  const queryClient = useQueryClient()

  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: ({ member, value }: { member: TeamMemberRow; value: boolean }) =>
      updateMember(member.id, { acceptsAutoAssign: value }),
    onMutate: async ({ member, value }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.tables })
      const snapshot: Snapshot = queryClient.getQueriesData<TeamTableResponse>({
        queryKey: teamKeys.tables,
      })
      patchMember(queryClient, member.id, (m) => ({
        ...m,
        acceptsAutoAssign: value,
      }))
      return { snapshot }
    },
    onError: (error, { member }, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toast.error(copy.autoAssignFailed(memberName(member)), {
        description: teamErrorMessage(error),
      })
    },
    onSuccess: (row) => patchMember(queryClient, row.id, () => row),
  })
}

/** Edit form and the suspend/activate item. */
export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: ({ id, input }: { id: string; input: UpdateMemberInput }) =>
      updateMember(id, input),
    onSuccess: (row) => {
      patchMember(queryClient, row.id, () => row)
      void queryClient.invalidateQueries({ queryKey: teamKeys.root })
    },
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (input: CreateMemberInput) => createMember(input),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: teamKeys.root }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: teamKeys.root }),
  })
}

export function useResetPassword() {
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (id: string) => resetMemberPassword(id),
  })
}
