import { useCallback, useEffect, useRef } from 'react'
import type { MemberSummary } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

/** Most companies reachable with Ctrl/Cmd + digit. */
export const MAX_SHORTCUT_COMPANIES = 9

/**
 * Company switching is 100% client side (see the tenant design): it changes
 * the `x-company-id` the next request carries. No endpoint, no socket
 * reconnect; `main.tsx` drops the cached queries when the id changes.
 */
export function useCompanySwitch() {
  const companies = useAuthStore((state) => state.auth.companies)
  const activeId = useAuthStore((state) => state.auth.company.id)
  const setCompany = useAuthStore((state) => state.auth.setCompany)

  const active = companies.find((m) => m.companyId === activeId) ?? null

  const switchTo = useCallback(
    (companyId: string) => {
      const target = companies.find((m) => m.companyId === companyId)
      if (!target || target.companyId === activeId) return false

      setCompany({ id: target.companyId })
      toast.success(`Ahora trabajas en ${target.companyName}`)
      return true
    },
    [companies, activeId, setCompany]
  )

  return { companies, active, activeId, switchTo }
}

/** Ctrl/Cmd + 1..9 jumps to the Nth company; inactive with a single one. */
export function useCompanyShortcuts() {
  const { companies, switchTo } = useCompanySwitch()

  useEffect(() => {
    if (companies.length < 2) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
        return
      }
      if (!/^[1-9]$/.test(event.key)) return

      const target = companies.slice(0, MAX_SHORTCUT_COMPANIES)[
        Number(event.key) - 1
      ]
      if (!target) return

      event.preventDefault()
      switchTo(target.companyId)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [companies, switchTo])
}

type CompanySnapshot = {
  activeId: string | null
  companies: MemberSummary[]
}

/**
 * Message for the case where the active company disappeared after a
 * membership refresh and the store fell back to another one. Returns null when
 * nothing was revoked (a normal switch or a refresh with the same companies).
 */
export function revokedCompanyNotice(
  previous: CompanySnapshot,
  next: CompanySnapshot
): string | null {
  const { activeId } = previous
  if (!activeId || !next.activeId || next.activeId === activeId) return null
  if (next.companies.some((m) => m.companyId === activeId)) return null

  const lost = previous.companies.find((m) => m.companyId === activeId)
  const now = next.companies.find((m) => m.companyId === next.activeId)

  return (
    `Ya no tienes acceso a ${lost?.companyName ?? 'esa empresa'}. ` +
    `Ahora trabajas en ${now?.companyName ?? 'otra empresa'}.`
  )
}

/** Tells the person when their active company was taken away from them. */
export function useRevokedCompanyNotice() {
  const companies = useAuthStore((state) => state.auth.companies)
  const activeId = useAuthStore((state) => state.auth.company.id)
  const previous = useRef<CompanySnapshot>({ activeId, companies })

  useEffect(() => {
    const message = revokedCompanyNotice(previous.current, {
      activeId,
      companies,
    })
    if (message) toast.warning(message)

    previous.current = { activeId, companies }
  }, [activeId, companies])
}
