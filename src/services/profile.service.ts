import {
  AuthUserSchema,
  AvatarUploadResultSchema,
  type AuthUser,
  type AvatarUploadResult,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const users = client('/users')
const auth = client('/auth')

// Dev-only runtime checks: they catch API/contract drift immediately.
const parseUser = (data: unknown): AuthUser =>
  import.meta.env.DEV ? AuthUserSchema.parse(data) : (data as AuthUser)

const parseAvatar = (data: unknown): AvatarUploadResult =>
  import.meta.env.DEV
    ? AvatarUploadResultSchema.parse(data)
    : (data as AvatarUploadResult)

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
