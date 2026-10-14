import { z } from 'zod'
import {
  CompanyStatusSchema,
  type PlatformCompanyQuery,
} from '@chat-crm/contracts'

/** Sortable columns of the companies table (server-side sort ids). */
export const COMPANY_SORT_IDS = ['name', 'createdAt'] as const

/**
 * Table state kept in the URL, so a filtered page can be bookmarked, shared
 * and survives a reload. Everything is optional: no param means "default".
 */
export const companiesSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  perPage: z.number().int().min(1).max(100).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  status: z.array(CompanyStatusSchema).optional().catch(undefined),
  /** Include soft-deleted companies. */
  deleted: z.boolean().optional().catch(undefined),
  /** `name.asc`, `createdAt.desc`… */
  sort: z.string().optional().catch(undefined),
})

export type CompaniesSearch = z.infer<typeof companiesSearchSchema>

export const DEFAULT_PER_PAGE = 10

export function parseSort(
  sort: string | undefined
): { id: string; desc: boolean }[] {
  if (!sort) return []
  const [id, direction] = sort.split('.')
  if (!(COMPANY_SORT_IDS as readonly string[]).includes(id)) return []
  return [{ id, desc: direction === 'desc' }]
}

export function serializeSort(
  sorting: { id: string; desc: boolean }[]
): string | undefined {
  const first = sorting[0]
  return first ? `${first.id}.${first.desc ? 'desc' : 'asc'}` : undefined
}

/** URL state -> body of `POST /platform/companies/table`. */
export function toCompanyQuery(search: CompaniesSearch): PlatformCompanyQuery {
  return {
    page: search.page ?? 1,
    perPage: search.perPage ?? DEFAULT_PER_PAGE,
    sort: parseSort(search.sort),
    q: search.q?.trim() || undefined,
    status: search.status?.length ? search.status : undefined,
    includeDeleted: search.deleted ?? false,
  }
}
