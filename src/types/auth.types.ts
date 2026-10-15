import type {
  AuthSessionResponse,
  LoginInput,
  MemberSummary,
} from '@chat-crm/contracts'

// Types come from the shared contracts (single source of truth).
export type { AuthUser } from '@chat-crm/contracts'

export type LoginForm = LoginInput

/** `GET /auth/me` / `POST /auth/refresh-memberships` response. */
export type AuthMe = AuthSessionResponse

export interface AuthState {
  auth: {
    /** Active company: sent as `x-company-id` on every request. */
    company: {
      id: string | null
    }
    /** Companies the user can switch between (active memberships). */
    companies: MemberSummary[]
    /** Switches the active company locally (no request). */
    setCompany: (company: { id: string }) => void
    user: AuthMe['user'] | null
    setUser: (user: AuthMe['user'] | null) => void
    /** Stores the session user, its companies and the resolved active company. */
    setSession: (user: AuthMe['user']) => void
    reset: () => void
  }
}
