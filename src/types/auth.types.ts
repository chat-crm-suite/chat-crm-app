import type { AuthUser, LoginInput } from '@chat-crm/contracts'

// Types come from the shared contracts (single source of truth).
export type { AuthUser } from '@chat-crm/contracts'

export type LoginForm = LoginInput

export type AuthMe = {
  user: AuthUser
  company: {
    id: string
  }
}

export interface AuthState {
  auth: {
    company: {
      id: string | null
    }
    setCompany: (company: { id: string }) => void
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    reset: () => void
  }
}
