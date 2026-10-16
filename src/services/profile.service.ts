import {
  AuthUserSchema,
  AvatarUploadResultSchema,
  type AuthUser,
  type AvatarUploadResult,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const users = client('/users')
const auth = client('/auth')

// Contract parse: coerces wire values (dates); strict in dev, tolerant in prod.
const parseUser = (data: unknown): AuthUser =>
  parseContract(AuthUserSchema, data)

const parseAvatar = (data: unknown): AvatarUploadResult =>
  parseContract(AvatarUploadResultSchema, data)

/** `PATCH /users/me`: names, phone and email (never the username). */
export const updateProfile = async (
  input: UpdateProfileInput
): Promise<AuthUser> => {
  const { data } = await users.patch('/me', input)
  return parseUser(data)
}

/** `POST /users/me/avatar`: multipart `file`, already resized by the client. */
export const uploadAvatar = async (file: Blob): Promise<AvatarUploadResult> => {
  const body = new FormData()
  body.append('file', file, 'avatar.webp')

  const { data } = await users.post('/me/avatar', body)
  return parseAvatar(data)
}

/** `POST /users/me/password`: other sessions are revoked by the API. */
export const changePassword = async (
  input: ChangePasswordInput
): Promise<void> => {
  await users.post('/me/password', input)
}

/** `POST /auth/revoke-all`: signs the account out of every device. */
export const revokeAllSessions = async (): Promise<void> => {
  await auth.post('/revoke-all')
}
