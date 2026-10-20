import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignMember,
  claimChat,
  releaseConversation,
  reopenConversation,
  resolveConversation,
  setConversationPending,
  transferConversation,
  updateConversationPriority,
} from '@/services/chat.service'
import type {
  CompanyMemberResponse,
  ConversationLifecycleResult,
  ConversationPriority,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/lib/api-error'
import { useMemberRole } from '@/hooks/use-member-role'
import { useChats } from '../contexts/chats.context'
import { copy } from '../copy'
import { lifecyclePatch, refreshAfterLifecycle } from '../lib/chat-cache'
import { conversationErrorMessage } from '../lib/conversation-errors'
import { chatKeys } from '../lib/query-keys'

export const memberDisplayName = (
  member: Pick<CompanyMemberResponse, 'firstName' | 'lastName' | 'username'>
) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') ||
  member.username

/** One toast per conversation assignment: a double click updates it. */
const assignmentToastId = (conversationId: string) =>
  `assignment:${conversationId}`

const noteInput = (note?: string) => (note?.trim() ? { note: note.trim() } : {})

/**
 * Every write of the case header and rail on one conversation. Each answer
 * (`ConversationLifecycleResultSchema`) patches the open chat and every list
 * tab right away, seeds the case cache, then refreshes lists and the work
 * queue in the background.
 */
export function useConversationLifecycle(conversationId: string) {
  const queryClient = useQueryClient()
  const { updateChat } = useChats()
  const { memberId } = useMemberRole()
  const user = useAuthStore((state) => state.auth.user)

  const onResult = (result: ConversationLifecycleResult) => {
    updateChat(result.id, lifecyclePatch(result))
    queryClient.setQueryData(chatKeys.case(result.id), { case: result.case })
    refreshAfterLifecycle(queryClient)
  }

  const onError = (error: unknown) =>
    toast.error(conversationErrorMessage(error, copy.lifecycleError))

  const reopen = useMutation({
    mutationFn: () => reopenConversation(conversationId),
    onSuccess: (result) => {
      onResult(result)
      toast.success(copy.reopenedToast)
    },
    onError,
  })

  const resolve = useMutation({
    mutationFn: (note?: string) =>
      resolveConversation(conversationId, noteInput(note)),
    onSuccess: (result) => {
      onResult(result)
      toast.success(copy.resolvedToast, {
        action: { label: copy.reopen, onClick: () => reopen.mutate() },
      })
    },
    onError,
  })

  const setPending = useMutation({
    mutationFn: (note?: string) =>
      setConversationPending(conversationId, noteInput(note)),
    onSuccess: (result) => {
      onResult(result)
      toast.success(copy.pendingToast)
    },
    onError,
  })

  const release = useMutation({
    mutationFn: (note?: string) =>
      releaseConversation(conversationId, noteInput(note)),
    onSuccess: (result) => {
      onResult(result)
      toast.success(copy.releasedToast)
    },
    onError,
  })

  const transfer = useMutation({
    mutationFn: (input: { member: CompanyMemberResponse; note?: string }) =>
      transferConversation(conversationId, {
        memberId: input.member.id,
        ...noteInput(input.note),
      }),
    onSuccess: (result, { member }) => {
      onResult(result)
      toast.success(copy.transferredToast(memberDisplayName(member)))
    },
    onError: (error) =>
      toast.error(conversationErrorMessage(error, copy.assignError)),
  })

  /** Assign a free conversation (legacy endpoint: no lifecycle answer). */
  const assign = useMutation({
    mutationFn: (member: CompanyMemberResponse) =>
      assignMember(conversationId, member.id),
    onSuccess: (_data, member) => {
      const isSelf = member.id === memberId
      updateChat(conversationId, {
        assignee: {
          memberId: member.id,
          userId: member.userId,
          name: memberDisplayName(member),
        },
      })
      refreshAfterLifecycle(queryClient)
      toast.success(isSelf ? copy.assignedSelfToast : copy.assignedToast, {
        id: assignmentToastId(conversationId),
      })
    },
    onError: (error) =>
      toast.error(conversationErrorMessage(error, copy.assignError)),
  })

  /** Claim a queued conversation for myself. */
  const take = useMutation({
    mutationFn: () => claimChat(conversationId),
    // Own action: the server never notifies the actor, so this toast is the
    // only one.
    onSuccess: () => {
      // Never persist an empty owner id: without a resolved member there is
      // nothing honest to store, the refetch fills it.
      if (memberId) {
        updateChat(conversationId, {
          assignee: {
            memberId,
            userId: user?.id ?? '',
            name:
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.username ||
              copy.you,
          },
        })
      }
      refreshAfterLifecycle(queryClient)
      toast.success(copy.assignedSelfToast, {
        id: assignmentToastId(conversationId),
      })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, copy.takeError))
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists })
    },
  })

  const setPriority = useMutation({
    mutationFn: (priority: ConversationPriority | null) =>
      updateConversationPriority(conversationId, { priority }),
    onSuccess: (item) => {
      updateChat(item.id, { priority: item.priority })
      refreshAfterLifecycle(queryClient)
      toast.success(copy.priorityToast)
    },
    onError,
  })

  return {
    resolve,
    setPending,
    reopen,
    release,
    transfer,
    assign,
    take,
    setPriority,
  }
}

export type ConversationLifecycle = ReturnType<typeof useConversationLifecycle>
