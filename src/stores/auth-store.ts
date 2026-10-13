import type { AuthState } from '@/types'
import { create } from 'zustand'
import {
  activeMemberships,
  pickActiveCompany,
  rememberActiveCompany,
} from '@/lib/active-company'

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: null,
    company: {
      id: null,
    },
    companies: [],
    setUser: (user) =>
      set((state) => ({
        auth: { ...state.auth, user },
      })),
    setSession: (user) => {
      const companies = activeMemberships(user)
      const id = pickActiveCompany(companies)
      if (id) rememberActiveCompany(id)

      set((state) => ({
        auth: { ...state.auth, user, companies, company: { id } },
      }))
    },
    setCompany: (company: { id: string }) => {
      rememberActiveCompany(company.id)
      set((state) => ({
        auth: {
          ...state.auth,
          company,
        },
      }))
    },
    reset: () =>
      set((state) => ({
        auth: {
          ...state.auth,
          user: null,
          companies: [],
          company: { id: null },
        },
      })),
  },
}))
