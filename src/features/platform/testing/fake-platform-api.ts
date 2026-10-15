import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type {
  PlatformCompanyRow,
  PlatformStatus,
} from '@chat-crm/contracts'

export type RecordedRequest = {
  method: string
  url: string
  body: unknown
}

type Reply = { status: number; data?: unknown }

/** In-memory stand-in for the platform endpoints, driven through an axios adapter. */
export function createFakePlatformApi(initial: {
  status?: Partial<PlatformStatus>
  companies?: PlatformCompanyRow[]
  /** Answer of the next `POST /platform/unlock` calls, in order. */
  unlockReplies?: Reply[]
}) {
  const state = {
    status: {
      enabled: true,
      unlocked: false,
      ...initial.status,
    } as PlatformStatus,
    companies: initial.companies ?? [],
    unlockReplies: [...(initial.unlockReplies ?? [])],
    /** When set, every company endpoint answers `platform_locked`. */
    expired: false,
    createReply: undefined as Reply | undefined,
    requests: [] as RecordedRequest[],
  }

  const ok = (data: unknown): Reply => ({ status: 200, data })

  const handle = (method: string, url: string, body: unknown): Reply => {
    if (method === 'get' && url === '/status') return ok(state.status)

    if (method === 'post' && url === '/unlock') {
      const reply = state.unlockReplies.shift()
      if (reply) {
        if (reply.status === 200) state.status = { ...state.status, unlocked: true }
        return reply
      }
      state.status = { ...state.status, unlocked: true }
      return ok(state.status)
    }

    if (method === 'post' && url === '/lock') {
      state.status = { ...state.status, unlocked: false }
      return ok(state.status)
    }

    if (url.startsWith('/companies')) {
      if (state.expired) {
        return {
          status: 403,
          data: { statusCode: 403, code: 'platform_locked', message: 'Locked' },
        }
      }

      if (method === 'post' && url === '/companies/table') {
        const query = body as {
          includeDeleted?: boolean
          q?: string
          status?: string[]
          page: number
          perPage: number
        }
        const items = state.companies.filter(
          (c) =>
            (query.includeDeleted || !c.deletedAt) &&
            (!query.q ||
              c.name.toLowerCase().includes(query.q.toLowerCase())) &&
            (!query.status?.length || query.status.includes(c.status))
        )
        const start = (query.page - 1) * query.perPage
        return ok({
          items: items.slice(start, start + query.perPage),
          meta: {
            totalItems: items.length,
            itemCount: items.length,
            itemsPerPage: query.perPage,
            totalPages: Math.max(1, Math.ceil(items.length / query.perPage)),
            currentPage: query.page,
          },
        })
      }

      if (method === 'post' && url === '/companies') {
        if (state.createReply) return state.createReply
        const input = body as { name: string; admin?: { email: string } }
        const company = row({ id: 'new', name: input.name, membersCount: 1 })
        state.companies = [company, ...state.companies]
        return ok({
          company,
          adminOutcome: input.admin ? 'created' : null,
          initialPassword: input.admin ? 'a1b2c3d4e5f6a7b8' : undefined,
        })
      }

      const id = url.split('/')[2]
      const target = state.companies.find((c) => c.id === id)

      if (method === 'patch' && target) {
        const next = { ...target, ...(body as object) } as PlatformCompanyRow
        state.companies = state.companies.map((c) => (c.id === id ? next : c))
        return ok(next)
      }

      if (method === 'delete' && target) {
        state.companies = state.companies.map((c) =>
          c.id === id ? { ...c, deletedAt: new Date('2026-10-14') } : c
        )
        return ok({ affectedMembers: target.membersCount })
      }

      if (method === 'post' && url.endsWith('/restore') && target) {
        const restored = { ...target, deletedAt: null }
        state.companies = state.companies.map((c) =>
          c.id === id ? restored : c
        )
        return ok(restored)
      }
    }

    return { status: 404, data: { message: 'Not found' } }
  }

  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''
    const body =
      typeof config.data === 'string' && config.data
        ? (JSON.parse(config.data) as unknown)
        : config.data
    state.requests.push({ method, url, body })

    const reply = handle(method, url, body)
    const response = {
      status: reply.status,
      statusText: String(reply.status),
      data: reply.data,
      headers: {},
      config,
    } as AxiosResponse

    if (reply.status >= 400) {
      return Promise.reject(
        new AxiosError(
          `Request failed with status code ${reply.status}`,
          AxiosError.ERR_BAD_REQUEST,
          config,
          null,
          response
        )
      )
    }
    return Promise.resolve(response)
  }

  /** Same shape as `client()` from `@/lib/http`, bound to this fake. */
  const client = (path: string) =>
    axios.create({ baseURL: `http://api.test${path}`, adapter })

  return {
    state,
    client,
    adapter,
    requestsTo: (method: string, url: string) =>
      state.requests.filter((r) => r.method === method && r.url === url),
  }
}

export function row(overrides: Partial<PlatformCompanyRow> = {}): PlatformCompanyRow {
  return {
    id: 'c1',
    name: 'Acme SAC',
    email: 'hola@acme.test',
    phoneNumber: null,
    address: null,
    timezone: 'America/Lima',
    status: 'active',
    membersCount: 3,
    customersCount: 120,
    channelsCount: 1,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    deletedAt: null,
    ...overrides,
  }
}
