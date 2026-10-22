import { getApiErrorMessage } from '@/lib/api-error'
import { getApiError } from '@/features/workspace/api-error-code'
import { CONVERSATION_ERROR_COPY } from '../copy'

/**
 * Spanish message of a failed conversation write: the API `code`
 * (`ConversationErrorCode`) first, then the server message, then `fallback`.
 */
export function conversationErrorMessage(error: unknown, fallback: string) {
  const { code } = getApiError(error)
  if (code && code in CONVERSATION_ERROR_COPY) {
    return CONVERSATION_ERROR_COPY[code as keyof typeof CONVERSATION_ERROR_COPY]
  }
  return getApiErrorMessage(error, fallback)
}
